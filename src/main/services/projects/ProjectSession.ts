import { readFileSync, watch, type FSWatcher } from 'fs'
import { basename } from 'path'
import type { BrowserWindow } from 'electron'
import { channels } from '../../../shared/contract/events'
import type { StateSaveRequest, StrategicRegionSaveRequest } from '../../../shared/contract/api'
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

  async loadSnapshot() {
    if (!this.project) throw new Error('Project not open')
    if (!this.pool) throw new Error('Project not open')

    const snapshot = await this.loader.loadSnapshot(this.project, this.pool)
    this.continents = snapshot.continents
    this.knownHashes.set(this.project.resolvedPaths.provinces, snapshot.provincesImageHash)
    this.watchCoreProjectFiles()
    return snapshot
  }

  loadStates(): Promise<void> {
    if (!this.project) throw new Error('Project not open')
    if (!this.pool) throw new Error('Project not open')
    if (this.statesLoadPromise) return this.statesLoadPromise
    if (this.statesLoaded) return Promise.resolve()

    const pool = this.pool
    const totalFiles = this.project.resolvedPaths.states.length
    this.emit('states', { op: 'replace', items: [], loadedFiles: 0, totalFiles })
    this.statesLoadPromise = this.loader.loadStatesProgressive(
      this.project,
      pool,
      (items, loadedFiles, totalFiles) => {
        this.emit('states', { op: 'append', items, loadedFiles, totalFiles })
      }
    ).then(() => {
      this.statesLoaded = true
      this.statesLoadPromise = null
      this.watchStateFiles()
    }).catch((error) => {
      this.statesLoadPromise = null
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

    const pool = this.pool
    this.resourcesLoadPromise = this.loader.loadResources(this.project, pool).then((resources) => {
      this.resourcesLoadPromise = null
      return resources
    }).catch((error) => {
      this.resourcesLoadPromise = null
      throw error
    })

    return this.resourcesLoadPromise
  }

  loadStrategicRegions(): Promise<void> {
    if (!this.project) throw new Error('Project not open')
    if (!this.pool) throw new Error('Project not open')
    if (this.strategicRegionsLoadPromise) return this.strategicRegionsLoadPromise
    if (this.strategicRegionsLoaded) return Promise.resolve()

    const pool = this.pool
    const totalFiles = this.project.resolvedPaths.strategicRegions.length
    this.emit('strategicRegions', { op: 'replace', items: [], loadedFiles: 0, totalFiles })
    this.strategicRegionsLoadPromise = this.loader.loadStrategicRegionsProgressive(
      this.project,
      pool,
      (items, loadedFiles, totalFiles) => {
        this.emit('strategicRegions', { op: 'append', items, loadedFiles, totalFiles })
      }
    ).then(() => {
      this.strategicRegionsLoaded = true
      this.strategicRegionsLoadPromise = null
      this.watchStrategicRegionFiles()
    }).catch((error) => {
      this.strategicRegionsLoadPromise = null
      throw error
    })

    return this.strategicRegionsLoadPromise
  }

  // ─── Saving ───────────────────────────────────────────────────────────────
  //
  // Every write goes through resolveWriteTarget: files from the base game are
  // written to the same relative path inside the mod folder instead, and the
  // session then reads from that copy.

  saveDefinitions(provinces: Province[], continents: Continent[]): void {
    const project = this.requireProject()
    const source = project.resolvedPaths.definitions
    const content = DefinitionsCsv.merge(readFileSync(source, 'utf-8'), provinces, continents)
    const target = resolveWriteTarget(project, source)
    this.writeProjectFile(target, content)
    this.relocate(source, target)
    this.refreshWatchers()
  }

  saveBmp(rgbaData: number[], width: number, height: number): void {
    const project = this.requireProject()
    const source = project.resolvedPaths.provinces
    const target = resolveWriteTarget(project, source)
    this.writeProjectFile(target, encodeBmp(rgbaData, width, height))
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
      this.emit('states', { op: 'patch', sourcePath: write.source, items, loadedFiles: 1, totalFiles: 1, origin: 'save' })
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
      this.emit('strategicRegions', { op: 'patch', sourcePath: write.source, items, loadedFiles: 1, totalFiles: 1, origin: 'save' })
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
    this.coreFilesWatched = true

    this.watch(this.project.resolvedPaths.continent, () => {
      if (!this.project) return
      const continents = this.loader.loadContinents(this.project)
      this.continents = continents
      this.emit('continents', continents)
      this.emit('definitions', this.loader.loadDefinitions(this.project, continents))
    })

    this.watch(this.project.resolvedPaths.definitions, () => {
      if (!this.project) return
      this.emit('definitions', this.loader.loadDefinitions(this.project, this.continents))
    })

    for (const filePath of this.project.resolvedPaths.provinceTerrain) {
      this.watch(filePath, () => {
        if (!this.project) return
        this.emit('terrain', this.loader.loadTerrain(this.project))
      })
    }

    this.watch(this.project.resolvedPaths.provinces, () => {
      if (!this.project) return
      this.emit('image', this.loader.loadImageBase64(this.project))
    })
  }

  private watchStateFiles(): void {
    if (!this.project) return

    for (const filePath of this.project.resolvedPaths.states) {
      this.watch(filePath, () => {
        if (!this.project || !this.pool) return
        if (!this.statesLoaded) return
        void this.reloadStateFile(filePath)
      })
    }
  }

  private async reloadStateFile(filePath: string): Promise<void> {
    if (!this.pool) return
    const rawItems = await this.pool.dispatch(filePath, 'states')
    const items = (rawItems as StateDefinition[]).map((item) => ({ ...item, sourcePath: filePath }))
    this.emit('states', { op: 'patch', sourcePath: filePath, items, loadedFiles: 1, totalFiles: 1, origin: 'external' })
  }

  private watchStrategicRegionFiles(): void {
    if (!this.project) return

    for (const filePath of this.project.resolvedPaths.strategicRegions) {
      this.watch(filePath, () => {
        if (!this.project || !this.pool) return
        if (!this.strategicRegionsLoaded) return
        void this.reloadStrategicRegionFile(filePath)
      })
    }
  }

  private async reloadStrategicRegionFile(filePath: string): Promise<void> {
    if (!this.pool) return
    const rawItems = await this.pool.dispatch(filePath, 'strategicRegions')
    const items = (rawItems as StrategicRegionDefinition[]).map((item) => ({ ...item, sourcePath: filePath }))
    this.emit('strategicRegions', { op: 'patch', sourcePath: filePath, items, loadedFiles: 1, totalFiles: 1, origin: 'external' })
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
        } catch {
          return // transient read failure during file replacement
        }
        if (this.knownHashes.get(path) === hash) return
        this.knownHashes.set(path, hash)
        try {
          entry.onChanged()
        } catch {
          // A half-written or invalid file; the next change event will retry.
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

  private emit(
    type: 'continents' | 'definitions' | 'terrain' | 'image' | 'states' | 'strategicRegions' | 'stateCategories' | 'buildings',
    data: unknown
  ): void {
    if (!this.project) return
    this.window.webContents.send(channels.map.changed, {
      projectId: this.project.projectId,
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
