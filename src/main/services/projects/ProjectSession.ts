import { mkdirSync, readFileSync, watch, writeFileSync, type FSWatcher } from 'fs'
import { dirname } from 'path'
import type { BrowserWindow } from 'electron'
import { channels } from '../../../shared/contract/events'
import type { ResolvedPaths } from '../../../shared/pathTypes'
import type { Continent, Province, Resource, StateDefinition, StrategicRegionDefinition } from '../../../shared/mapDataTypes'
import type { LoadedProject, ProjectLoader } from './ProjectLoader'
import { WorkerParsePool } from '../../workers/WorkerParsePool'
import { encodeBmp } from '../../parsers/BmpWriter'
import { DefinitionsCsv } from '../../parsers/DefinitionsCsv'
import { StatesTxt } from '../../parsers/StatesTxt'
import { serializeState } from '../../parsers/StatesTxtWriter'
import { StrategicRegionsTxt } from '../../parsers/StrategicRegionsTxt'
import { serializeRegion } from '../../parsers/StrategicRegionsTxtWriter'
import { computeHash } from '../../fileManager'
import { resolveWriteTarget } from './writeTargets'

interface WatchEntry {
  watcher: FSWatcher
  debounce: ReturnType<typeof setTimeout> | null
  onChanged: () => void
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
    const content = DefinitionsCsv.serialize(provinces, continents, DefinitionsCsv.detectLineEnding(readFileSync(source, 'utf-8')))
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

  saveStates(states: StateDefinition[]): void {
    const project = this.requireProject()
    for (const state of states) {
      const source = state.sourcePath
      if (!source) throw new Error(`State ${state.id} has no sourcePath`)
      const target = resolveWriteTarget(project, source)
      this.writeProjectFile(target, serializeState(state))
      this.relocate(source, target)
      const items: StateDefinition[] = StatesTxt.parse(readFileSync(target, 'utf-8')).map((item) => ({ ...item, sourcePath: target }))
      this.emit('states', { op: 'patch', sourcePath: source, items, loadedFiles: 1, totalFiles: 1, origin: 'save' })
    }
    this.refreshWatchers()
  }

  saveStrategicRegions(regions: StrategicRegionDefinition[]): void {
    const project = this.requireProject()
    for (const region of regions) {
      const source = region.sourcePath
      if (!source) throw new Error(`Strategic region ${region.id} has no sourcePath`)
      const target = resolveWriteTarget(project, source)
      this.writeProjectFile(target, serializeRegion(region))
      this.relocate(source, target)
      const items: StrategicRegionDefinition[] = StrategicRegionsTxt.parse(readFileSync(target, 'utf-8'))
        .map((item) => ({ ...item, sourcePath: target }))
      this.emit('strategicRegions', { op: 'patch', sourcePath: source, items, loadedFiles: 1, totalFiles: 1, origin: 'save' })
    }
    this.refreshWatchers()
  }

  // Writes the file and records its hash so the resulting watcher event is
  // recognised as our own write. Returns the hash of the written content.
  private writeProjectFile(target: string, data: string | Buffer): string {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data
    const hash = computeHash(buffer)
    this.knownHashes.set(target, hash)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, buffer)
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
