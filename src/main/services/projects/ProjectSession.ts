import { readFileSync, watch, type FSWatcher } from 'fs'
import { basename } from 'path'
import type { BrowserWindow } from 'electron'
import { channels } from '../../../shared/contract/events'
import type {
  DefinitionsSaveResult,
  StateSaveRequest,
  StrategicRegionSaveRequest
} from '../../../shared/contract/api'
import type { ResolvedPaths } from '../../../shared/pathTypes'
import type { Continent, Province, Resource, StateDefinition, StrategicRegionDefinition } from '../../../shared/mapDataTypes'
import type { LoadedProject, ProjectLoader } from './ProjectLoader'
import { WorkerParsePool } from '../../workers/WorkerParsePool'
import { encodeBmp } from '../../parsers/BmpWriter'
import { DefinitionsCsv } from '../../parsers/DefinitionsCsv'
import { StatesTxt } from '../../parsers/StatesTxt'
import { applyStateSaves } from '../../parsers/StatesTxtWriter'
import { StrategicRegionsTxt } from '../../parsers/StrategicRegionsTxt'
import { applyStrategicRegionSaves } from '../../parsers/StrategicRegionsTxtWriter'
import { computeHash } from '../../fileManager'
import { resolveWriteTarget, writeFileAtomic } from './writeTargets'
import { log } from '../../logger'
import { timeSync } from '../../perf'

interface WatchEntry {
  watcher: FSWatcher
  debounce: ReturnType<typeof setTimeout> | null
  onChanged: () => void
}

interface PlannedWrite {
  source: string
  target: string
  content: string
}

export class ProjectSession {
  private readonly watchers = new Map<string, WatchEntry>()
  // Hash of the content this session last loaded or wrote, per path. Watcher
  // events whose content matches are ignored, which filters out our own saves
  // and editors that touch a file without changing it.
  private readonly knownHashes = new Map<string, string>()
  private project: LoadedProject | null = null
  private pool: WorkerParsePool | null = null
  private continents: Continent[] = []
  private coreFilesWatched = false
  private statesLoaded = false
  private strategicRegionsLoaded = false
  private statesLoadPromise: Promise<void> | null = null
  private strategicRegionsLoadPromise: Promise<void> | null = null
  private resourcesLoadPromise: Promise<Resource[]> | null = null

  constructor(
    private readonly window: BrowserWindow,
    private readonly loader: ProjectLoader
  ) {}

  open(project: LoadedProject): LoadedProject {
    this.disposePool()
    this.disposeWatchers()
    this.project = project
    this.pool = new WorkerParsePool()
    this.continents = []
    this.coreFilesWatched = false
    this.statesLoaded = false
    this.strategicRegionsLoaded = false
    this.statesLoadPromise = null
    this.strategicRegionsLoadPromise = null
    this.resourcesLoadPromise = null
    return project
  }

  get projectId(): string | null {
    return this.project?.projectId ?? null
  }

  requireProject(): LoadedProject {
    if (!this.project) throw new Error('Project not open')
    return this.project
  }

  // True if `path` is one of this project's own resolved files — used to keep
  // the generic files:load/files:read channel from reading arbitrary paths a
  // (buggy or compromised) renderer might send.
  isKnownPath(path: string): boolean {
    if (!this.project) return false
    for (const value of Object.values(this.project.resolvedPaths)) {
      if (Array.isArray(value) ? value.includes(path) : value === path) return true
    }
    return false
  }

  async loadSnapshot() {
    if (!this.project) throw new Error('Project not open')
    if (!this.pool) throw new Error('Project not open')
    const project = this.project

    const snapshot = await this.loader.loadSnapshot(project, this.pool)
    // A different project may have been opened (or this one closed) while
    // that load was in flight — its own promise still resolves normally for
    // whoever's awaiting it (the renderer already ignores a stale reply), but
    // this session's own state must not be overwritten with stale data.
    if (this.project === project) {
      this.continents = snapshot.continents
      this.knownHashes.set(project.resolvedPaths.definitions, snapshot.definitionsHash)
      this.knownHashes.set(project.resolvedPaths.provinces, snapshot.provincesImageHash)
      this.watchCoreProjectFiles()
    }
    return snapshot
  }

  loadStates(): Promise<void> {
    if (!this.project) throw new Error('Project not open')
    if (!this.pool) throw new Error('Project not open')
    if (this.statesLoadPromise) return this.statesLoadPromise
    if (this.statesLoaded) return Promise.resolve()

    const project = this.project
    const pool = this.pool
    const totalFiles = project.resolvedPaths.states.length
    this.emit(project, 'states', { op: 'replace', items: [], loadedFiles: 0, totalFiles })
    this.statesLoadPromise = this.loader.loadStatesProgressive(
      project,
      pool,
      (items, loadedFiles, totalFiles) => {
        // This can keep arriving well after open()/dispose() moved this
        // session on to a different (or no) project — ignore it then.
        if (this.project !== project) return
        this.emit(project, 'states', { op: 'append', items, loadedFiles, totalFiles })
      }
    ).then(() => {
      if (this.project !== project) return
      this.statesLoaded = true
      this.statesLoadPromise = null
      this.watchStateFiles()
    }).catch((error) => {
      if (this.project === project) this.statesLoadPromise = null
      throw error
    })

    return this.statesLoadPromise
  }

  loadWeatherEntries(): string[] {
    const project = this.requireProject()
    return this.loader.loadWeatherEntries(project)
  }

  loadResources(): Promise<Resource[]> {
    if (!this.project) throw new Error('Project not open')
    if (!this.pool) throw new Error('Project not open')
    if (this.resourcesLoadPromise) return this.resourcesLoadPromise

    const project = this.project
    const pool = this.pool
    this.resourcesLoadPromise = this.loader.loadResources(project, pool).then((resources) => {
      if (this.project === project) this.resourcesLoadPromise = null
      return resources
    }).catch((error) => {
      if (this.project === project) this.resourcesLoadPromise = null
      throw error
    })

    return this.resourcesLoadPromise
  }

  loadStrategicRegions(): Promise<void> {
    if (!this.project) throw new Error('Project not open')
    if (!this.pool) throw new Error('Project not open')
    if (this.strategicRegionsLoadPromise) return this.strategicRegionsLoadPromise
    if (this.strategicRegionsLoaded) return Promise.resolve()

    const project = this.project
    const pool = this.pool
    const totalFiles = project.resolvedPaths.strategicRegions.length
    this.emit(project, 'strategicRegions', { op: 'replace', items: [], loadedFiles: 0, totalFiles })
    this.strategicRegionsLoadPromise = this.loader.loadStrategicRegionsProgressive(
      project,
      pool,
      (items, loadedFiles, totalFiles) => {
        if (this.project !== project) return
        this.emit(project, 'strategicRegions', { op: 'append', items, loadedFiles, totalFiles })
      }
    ).then(() => {
      if (this.project !== project) return
      this.strategicRegionsLoaded = true
      this.strategicRegionsLoadPromise = null
      this.watchStrategicRegionFiles()
    }).catch((error) => {
      if (this.project === project) this.strategicRegionsLoadPromise = null
      throw error
    })

    return this.strategicRegionsLoadPromise
  }

  // ─── Saving ───────────────────────────────────────────────────────────────
  //
  // Every write goes through resolveWriteTarget: files from the base game are
  // written to the same relative path inside the mod folder instead, and the
  // session then reads from that copy.

  saveDefinitions(provinces: Province[], continents: Continent[], expectedHash: string): DefinitionsSaveResult {
    const project = this.requireProject()
    const source = project.resolvedPaths.definitions
    const buffer = readFileSync(source)
    if (computeHash(buffer) !== expectedHash) {
      // Push the current file to the renderer now rather than waiting for the
      // watcher, so the edits can be reviewed against it.
      log.warn('Save rejected: definitions.csv changed on disk since it was loaded', { source })
      const definitions = this.loader.loadDefinitions(project, this.continents)
      this.knownHashes.set(source, definitions.hash)
      this.emit(project, 'definitions', definitions)
      throw new Error(`${basename(source)} changed on disk after it was loaded. Its new contents are being reloaded; review your changes and save again.`)
    }

    const content = timeSync('DefinitionsCsv.merge', () => DefinitionsCsv.merge(buffer.toString('utf-8'), provinces, continents))
    const target = resolveWriteTarget(project, source)
    const hash = this.writeProjectFile(target, content)
    this.relocate(source, target)
    this.refreshWatchers()
    return { hash }
  }

  saveBmp(rgbaData: Uint8Array, width: number, height: number): void {
    const project = this.requireProject()
    const source = project.resolvedPaths.provinces
    const target = resolveWriteTarget(project, source)
    log.debug('saveBmp', { width, height, bytes: rgbaData.byteLength })
    this.writeProjectFile(target, timeSync('encodeBmp', () => encodeBmp(rgbaData, width, height)))
    this.relocate(source, target)
    this.refreshWatchers()
  }

  saveStates(requests: StateSaveRequest[]): void {
    const project = this.requireProject()
    const groups = groupBySourceFile(
      requests,
      (request) => request.original.sourcePath,
      (request) => `State ${request.original.id}`,
      project.resolvedPaths.states
    )

    const writes: PlannedWrite[] = []
    const conflicts: string[] = []
    for (const [source, group] of groups) {
      const content = readFileSync(source, 'utf-8')
      const result = applyStateSaves(content, group)
      conflicts.push(...result.conflicts.map((message) => `${basename(source)}: ${message}`))
      if (result.content !== content) writes.push({ source, target: resolveWriteTarget(project, source), content: result.content })
    }
    if (conflicts.length > 0) throw new Error(`Nothing was saved.\n${conflicts.join('\n')}`)

    for (const write of writes) {
      this.writeProjectFile(write.target, write.content)
      this.relocate(write.source, write.target)
      const items: StateDefinition[] = StatesTxt.parse(write.content).map((state) => ({ ...state, sourcePath: write.target }))
      this.emit(project, 'states', { op: 'patch', sourcePath: write.source, items, loadedFiles: 1, totalFiles: 1, origin: 'save' })
    }
    this.refreshWatchers()
  }

  saveStrategicRegions(requests: StrategicRegionSaveRequest[]): void {
    const project = this.requireProject()
    const groups = groupBySourceFile(
      requests,
      (request) => request.original.sourcePath,
      (request) => `Strategic region ${request.original.id}`,
      project.resolvedPaths.strategicRegions
    )

    const writes: PlannedWrite[] = []
    const conflicts: string[] = []
    for (const [source, group] of groups) {
      const content = readFileSync(source, 'utf-8')
      const result = applyStrategicRegionSaves(content, group)
      conflicts.push(...result.conflicts.map((message) => `${basename(source)}: ${message}`))
      if (result.content !== content) writes.push({ source, target: resolveWriteTarget(project, source), content: result.content })
    }
    if (conflicts.length > 0) throw new Error(`Nothing was saved.\n${conflicts.join('\n')}`)

    for (const write of writes) {
      this.writeProjectFile(write.target, write.content)
      this.relocate(write.source, write.target)
      const items: StrategicRegionDefinition[] = StrategicRegionsTxt.parse(write.content)
        .map((region) => ({ ...region, sourcePath: write.target }))
      this.emit(project, 'strategicRegions', { op: 'patch', sourcePath: write.source, items, loadedFiles: 1, totalFiles: 1, origin: 'save' })
    }
    this.refreshWatchers()
  }

  // Writes atomically and records the hash so the resulting watcher event is
  // recognised as our own write. Returns the hash of the written content.
  private writeProjectFile(target: string, data: string | Buffer): string {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data
    const hash = computeHash(buffer)
    this.knownHashes.set(target, hash)
    writeFileAtomic(target, buffer)
    // The rename replaces the file; re-arm its watcher so platforms that watch
    // by inode keep following the path.
    this.rewatch(target)
    return hash
  }

  // After a copy-on-write save the mod copy shadows the game file: point the
  // project's resolved paths at it and stop watching the game file.
  private relocate(from: string, to: string): void {
    if (from === to || !this.project) return
    const paths = this.project.resolvedPaths
    for (const key of Object.keys(paths) as (keyof ResolvedPaths)[]) {
      const value = paths[key]
      if (Array.isArray(value)) {
        const index = value.indexOf(from)
        if (index !== -1) value[index] = to
      } else if (value === from) {
        (paths[key] as string) = to
      }
    }
    this.unwatch(from)
    this.knownHashes.delete(from)
  }

  // ─── Watching ─────────────────────────────────────────────────────────────

  // Registers watchers for any resolved path not yet watched (e.g. after a
  // save relocated a file into the mod folder).
  private refreshWatchers(): void {
    if (this.coreFilesWatched) this.watchCoreProjectFiles()
    if (this.statesLoaded) this.watchStateFiles()
    if (this.strategicRegionsLoaded) this.watchStrategicRegionFiles()
  }

  private watchCoreProjectFiles(): void {
    if (!this.project) return
    const project = this.project
    this.coreFilesWatched = true

    this.watch(project.resolvedPaths.continent, () => {
      if (this.project !== project) return
      const continents = this.loader.loadContinents(project)
      this.continents = continents
      this.emit(project, 'continents', continents)
      const definitions = this.loader.loadDefinitions(project, continents)
      this.knownHashes.set(project.resolvedPaths.definitions, definitions.hash)
      this.emit(project, 'definitions', definitions)
    })

    this.watch(project.resolvedPaths.definitions, () => {
      if (this.project !== project) return
      this.emit(project, 'definitions', this.loader.loadDefinitions(project, this.continents))
    })

    for (const filePath of project.resolvedPaths.provinceTerrain) {
      this.watch(filePath, () => {
        if (this.project !== project) return
        this.emit(project, 'terrain', this.loader.loadTerrain(project))
      })
    }

    for (const filePath of project.resolvedPaths.stateCategories) {
      this.watch(filePath, () => {
        if (this.project !== project) return
        this.emit(project, 'stateCategories', this.loader.loadStateCategories(project))
      })
    }

    for (const filePath of project.resolvedPaths.buildings) {
      this.watch(filePath, () => {
        if (this.project !== project) return
        this.emit(project, 'buildings', this.loader.loadBuildings(project))
      })
    }

    this.watch(project.resolvedPaths.provinces, () => {
      if (this.project !== project) return
      this.emit(project, 'image', this.loader.loadImageBuffer(project))
    })
  }

  private watchStateFiles(): void {
    if (!this.project) return
    const project = this.project

    for (const filePath of project.resolvedPaths.states) {
      this.watch(filePath, () => {
        if (this.project !== project || !this.pool) return
        if (!this.statesLoaded) return
        this.reloadStateFile(project, filePath).catch((error) => {
          // The file may have been removed, or the worker pool disposed by a
          // project switch mid-read; the next change (or reopen) will retry.
          log.warn('Failed to reload a states file after an external change', { filePath, error: String(error) })
        })
      })
    }
  }

  private async reloadStateFile(project: LoadedProject, filePath: string): Promise<void> {
    if (!this.pool) return
    const rawItems = await this.pool.dispatch(filePath, 'states')
    if (this.project !== project) return
    const items = (rawItems as StateDefinition[]).map((item) => ({ ...item, sourcePath: filePath }))
    this.emit(project, 'states', { op: 'patch', sourcePath: filePath, items, loadedFiles: 1, totalFiles: 1, origin: 'external' })
  }

  private watchStrategicRegionFiles(): void {
    if (!this.project) return
    const project = this.project

    for (const filePath of project.resolvedPaths.strategicRegions) {
      this.watch(filePath, () => {
        if (this.project !== project || !this.pool) return
        if (!this.strategicRegionsLoaded) return
        this.reloadStrategicRegionFile(project, filePath).catch((error) => {
          // Same as reloadStateFile: a transient failure, safe to drop.
          log.warn('Failed to reload a strategic regions file after an external change', { filePath, error: String(error) })
        })
      })
    }
  }

  private async reloadStrategicRegionFile(project: LoadedProject, filePath: string): Promise<void> {
    if (!this.pool) return
    const rawItems = await this.pool.dispatch(filePath, 'strategicRegions')
    if (this.project !== project) return
    const items = (rawItems as StrategicRegionDefinition[]).map((item) => ({ ...item, sourcePath: filePath }))
    this.emit(project, 'strategicRegions', { op: 'patch', sourcePath: filePath, items, loadedFiles: 1, totalFiles: 1, origin: 'external' })
  }

  private watch(path: string, onChanged: () => void): void {
    if (this.watchers.has(path)) return

    const entry: WatchEntry = { watcher: null!, debounce: null, onChanged }
    entry.watcher = watch(path, () => {
      if (entry.debounce) clearTimeout(entry.debounce)
      entry.debounce = setTimeout(() => {
        entry.debounce = null
        let hash: string
        try {
          hash = computeHash(readFileSync(path))
        } catch (error) {
          log.warn('Watcher: transient read failure during file replacement', { path, error: String(error) })
          return
        }
        if (this.knownHashes.get(path) === hash) {
          log.debug('Watcher: change suppressed (matches known hash, likely our own write)', { path })
          return
        }
        this.knownHashes.set(path, hash)
        try {
          entry.onChanged()
        } catch (error) {
          // A half-written or invalid file; the next change event will retry.
          log.error('Watcher: onChanged handler threw, will retry on next change', { path, error: String(error) })
        }
      }, 100)
    })
    // The watched file can disappear (e.g. replaced by another tool); a watcher
    // error must not crash the main process.
    entry.watcher.on('error', () => this.unwatch(path))

    this.watchers.set(path, entry)
  }

  private rewatch(path: string): void {
    const entry = this.watchers.get(path)
    if (!entry) return
    this.unwatch(path)
    this.watch(path, entry.onChanged)
  }

  private unwatch(path: string): void {
    const entry = this.watchers.get(path)
    if (!entry) return
    if (entry.debounce) clearTimeout(entry.debounce)
    entry.watcher.close()
    this.watchers.delete(path)
  }

  // `project` must be the one the caller captured before its own async gap
  // (or requireProject(), for a synchronous caller) — never a fresh read of
  // this.project, which may have moved on to a different project by the time
  // an async operation gets around to emitting. See loadStates() and friends.
  private emit(
    project: LoadedProject,
    type: 'continents' | 'definitions' | 'terrain' | 'image' | 'states' | 'strategicRegions' | 'stateCategories' | 'buildings',
    data: unknown
  ): void {
    this.window.webContents.send(channels.map.changed, {
      projectId: project.projectId,
      type,
      data
    })
  }

  dispose(): void {
    this.disposeWatchers()
    this.disposePool()
    this.project = null
    this.continents = []
    this.coreFilesWatched = false
    this.statesLoaded = false
    this.strategicRegionsLoaded = false
    this.statesLoadPromise = null
    this.strategicRegionsLoadPromise = null
    this.resourcesLoadPromise = null
  }

  private disposePool(): void {
    if (this.pool) {
      void this.pool.dispose()
      this.pool = null
    }
  }

  private disposeWatchers(): void {
    for (const entry of this.watchers.values()) {
      if (entry.debounce) clearTimeout(entry.debounce)
      entry.watcher.close()
    }
    this.watchers.clear()
    this.knownHashes.clear()
  }
}

// Groups save requests by the file they came from, refusing any request whose
// file isn't one this project loaded.
function groupBySourceFile<T>(
  requests: readonly T[],
  sourceOf: (request: T) => string | undefined,
  describe: (request: T) => string,
  allowedPaths: readonly string[]
): Map<string, T[]> {
  const allowed = new Set(allowedPaths)
  const groups = new Map<string, T[]>()
  for (const request of requests) {
    const source = sourceOf(request)
    if (!source || !allowed.has(source)) {
      throw new Error(`${describe(request)} does not come from a file in this project; nothing was saved.`)
    }
    const group = groups.get(source)
    if (group) group.push(request)
    else groups.set(source, [request])
  }
  return groups
}
