import { readFileSync, watch, type FSWatcher } from 'fs'
import type { BrowserWindow } from 'electron'
import { channels } from '../../../shared/contract/events'
import type { Continent, StateDefinition, StrategicRegionDefinition } from '../../../shared/mapDataTypes'
import type { LoadedProject, ProjectLoader } from './ProjectLoader'

interface WatchEntry {
  watcher: FSWatcher
  debounce: ReturnType<typeof setTimeout> | null
}

export class ProjectSession {
  private readonly watchers = new Map<string, WatchEntry>()
  private project: LoadedProject | null = null
  private continents: Continent[] = []
  private statesLoaded = false
  private strategicRegionsLoaded = false
  private statesLoadPromise: Promise<void> | null = null
  private strategicRegionsLoadPromise: Promise<void> | null = null

  constructor(
    private readonly window: BrowserWindow,
    private readonly loader: ProjectLoader
  ) {}

  open(project: LoadedProject): LoadedProject {
    this.disposeWatchers()
    this.project = project
    this.continents = []
    this.statesLoaded = false
    this.strategicRegionsLoaded = false
    this.statesLoadPromise = null
    this.strategicRegionsLoadPromise = null
    return project
  }

  get projectId(): string | null {
    return this.project?.projectId ?? null
  }

  requireProject(): LoadedProject {
    if (!this.project) throw new Error('Project not open')
    return this.project
  }

  loadSnapshot() {
    if (!this.project) throw new Error('Project not open')

    const snapshot = this.loader.loadSnapshot(this.project)
    this.continents = snapshot.continents
    this.watchCoreProjectFiles()
    return snapshot
  }

  loadStates(): Promise<void> {
    if (!this.project) throw new Error('Project not open')
    this.watchStateFiles()
    if (this.statesLoadPromise) return this.statesLoadPromise
    if (this.statesLoaded) return Promise.resolve()

    const totalFiles = this.project.resolvedPaths.states.length
    this.emit('states', { op: 'replace', items: [], loadedFiles: 0, totalFiles })
    this.statesLoadPromise = this.loader.loadStatesProgressive(this.project, (items, loadedFiles, totalFiles) => {
      this.emit('states', { op: 'append', items, loadedFiles, totalFiles })
    }).then(() => {
      this.statesLoaded = true
      this.statesLoadPromise = null
    }).catch((error) => {
      this.statesLoadPromise = null
      throw error
    })

    return this.statesLoadPromise
  }

  loadStrategicRegions(): Promise<void> {
    if (!this.project) throw new Error('Project not open')
    this.watchStrategicRegionFiles()
    if (this.strategicRegionsLoadPromise) return this.strategicRegionsLoadPromise
    if (this.strategicRegionsLoaded) return Promise.resolve()

    const totalFiles = this.project.resolvedPaths.strategicRegions.length
    this.emit('strategicRegions', { op: 'replace', items: [], loadedFiles: 0, totalFiles })
    this.strategicRegionsLoadPromise = this.loader.loadStrategicRegionsProgressive(this.project, (items, loadedFiles, totalFiles) => {
      this.emit('strategicRegions', { op: 'append', items, loadedFiles, totalFiles })
    }).then(() => {
      this.strategicRegionsLoaded = true
      this.strategicRegionsLoadPromise = null
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
      this.emit('image', this.loader.loadImageBase64(this.project))
    })
  }

  private watchStateFiles(): void {
    if (!this.project) return

    for (const filePath of this.project.resolvedPaths.states) {
      this.watch(filePath, () => {
        if (!this.project) return
        if (!this.statesLoaded) return
        this.statesLoaded = false
        this.statesLoadPromise = null
        void this.loadStates()
      })
    }
  }

  private watchStrategicRegionFiles(): void {
    if (!this.project) return

    for (const filePath of this.project.resolvedPaths.strategicRegions) {
      this.watch(filePath, () => {
        if (!this.project) return
        if (!this.strategicRegionsLoaded) return
        this.strategicRegionsLoaded = false
        this.strategicRegionsLoadPromise = null
        void this.loadStrategicRegions()
      })
    }
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
    type: 'continents' | 'definitions' | 'terrain' | 'image' | 'states' | 'strategicRegions',
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
    this.project = null
    this.continents = []
    this.statesLoaded = false
    this.strategicRegionsLoaded = false
    this.statesLoadPromise = null
    this.strategicRegionsLoadPromise = null
  }

  private disposeWatchers(): void {
    for (const entry of this.watchers.values()) {
      if (entry.debounce) clearTimeout(entry.debounce)
      entry.watcher.close()
    }
    this.watchers.clear()
  }
}
