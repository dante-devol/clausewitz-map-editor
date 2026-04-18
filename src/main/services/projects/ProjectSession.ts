import { readFileSync, watch, type FSWatcher } from 'fs'
import type { BrowserWindow } from 'electron'
import { channels } from '../../../shared/contract/events'
import type { Continent } from '../../../shared/mapDataTypes'
import type { LoadedProject, ProjectLoader } from './ProjectLoader'

interface WatchEntry {
  watcher: FSWatcher
  debounce: ReturnType<typeof setTimeout> | null
}

export class ProjectSession {
  private readonly watchers = new Map<string, WatchEntry>()
  private project: LoadedProject | null = null
  private continents: Continent[] = []

  constructor(
    private readonly window: BrowserWindow,
    private readonly loader: ProjectLoader
  ) {}

  open(project: LoadedProject): LoadedProject {
    this.disposeWatchers()
    this.project = project
    this.continents = []
    return project
  }

  get projectId(): string | null {
    return this.project?.projectId ?? null
  }

  loadSnapshot() {
    if (!this.project) throw new Error('Project not open')

    const snapshot = this.loader.loadSnapshot(this.project)
    this.continents = snapshot.continents
    this.watchProjectFiles()
    return snapshot
  }

  private watchProjectFiles(): void {
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

  private emit(type: 'continents' | 'definitions' | 'terrain' | 'image', data: unknown): void {
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
  }

  private disposeWatchers(): void {
    for (const entry of this.watchers.values()) {
      if (entry.debounce) clearTimeout(entry.debounce)
      entry.watcher.close()
    }
    this.watchers.clear()
  }
}
