import { readFileSync, watch, type FSWatcher } from 'fs'
import type { BrowserWindow } from 'electron'
import { channels } from '../../../shared/contract/events'
import type { Continent, Resource, StateDefinition, StrategicRegionDefinition } from '../../../shared/mapDataTypes'
import type { LoadedProject, ProjectLoader } from './ProjectLoader'
import { WorkerParsePool } from '../../workers/WorkerParsePool'
import { writeBmp } from '../../parsers/BmpWriter'

interface WatchEntry {
  watcher: FSWatcher
  debounce: ReturnType<typeof setTimeout> | null
}

export class ProjectSession {
  private readonly watchers = new Map<string, WatchEntry>()
  private suppressImageChanges = 0
  private project: LoadedProject | null = null
  private pool: WorkerParsePool | null = null
  private continents: Continent[] = []
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

  saveBmp(rgbaData: number[], width: number, height: number): void {
    const project = this.requireProject()
    this.suppressImageChanges++
    writeBmp(project.resolvedPaths.provinces, rgbaData, width, height)
  }

  saveStates(states: StateDefinition[]): void {
    this.loader.saveStates(states)
  }

  saveStrategicRegions(regions: StrategicRegionDefinition[]): void {
    this.loader.saveStrategicRegions(regions)
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

  private watchCoreProjectFiles(): void {
    if (!this.project) return

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
      if (this.suppressImageChanges > 0) { this.suppressImageChanges--; return }
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
    this.emit('states', { op: 'patch', sourcePath: filePath, items, loadedFiles: 1, totalFiles: 1 })
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
    this.emit('strategicRegions', { op: 'patch', sourcePath: filePath, items, loadedFiles: 1, totalFiles: 1 })
  }

  private watch(path: string, onChanged: () => void): void {
    if (this.watchers.has(path)) return

    const entry: WatchEntry = { watcher: null!, debounce: null }
    entry.watcher = watch(path, () => {
      if (entry.debounce) clearTimeout(entry.debounce)
      entry.debounce = setTimeout(() => {
        try {
          readFileSync(path)
          onChanged()
        } catch {
          // Ignore transient read failures during file replacement.
        }
      }, 100)
    })

    this.watchers.set(path, entry)
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
  }
}
