import type { BrowserWindow } from 'electron'
import { ProjectLoader } from './ProjectLoader'
import { ProjectSession } from './ProjectSession'
import type {
  DefinitionsSaveResult,
  ProjectOpenRequest,
  ProjectOpenResult,
  StateSaveOperation,
  StrategicRegionSaveOperation
} from '../../../shared/contract/api'
import type { Continent, Province } from '../../../shared/mapDataTypes'

export class ProjectSessionRegistry {
  private readonly sessions = new Map<number, ProjectSession>()
  private readonly loader = new ProjectLoader()

  forWindow(window: BrowserWindow): ProjectSession {
    const key = window.webContents.id
    const existing = this.sessions.get(key)
    if (existing) return existing

    const session = new ProjectSession(window, this.loader)
    this.sessions.set(key, session)
    window.on('closed', () => {
      session.dispose()
      this.sessions.delete(key)
    })
    return session
  }

  openForWindow(window: BrowserWindow, request: ProjectOpenRequest): ProjectOpenResult {
    const session = this.forWindow(window)
    return session.open(this.loader.open(request))
  }

  // Whether `path` belongs to whatever project is currently open in this
  // window — regardless of what projectId the caller believes it's using,
  // since there's exactly one active project per window.
  isPathKnownForWindow(window: BrowserWindow, path: string): boolean {
    return this.forWindow(window).isKnownPath(path)
  }

  // Tears down watchers and the worker pool for a project the renderer is
  // leaving (e.g. the Back button), without waiting for the window to close
  // or a new project to be opened — open() would dispose them anyway, but
  // until then they'd sit idle holding one worker thread per CPU core.
  closeForWindow(window: BrowserWindow, projectId: string): void {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) throw new Error('Project session mismatch')
    session.dispose()
  }

  loadForWindow(window: BrowserWindow, projectId: string) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) {
      throw new Error('Project session mismatch')
    }
    return session.loadSnapshot()
  }

  loadStatesForWindow(window: BrowserWindow, projectId: string) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) {
      throw new Error('Project session mismatch')
    }
    return session.loadStates()
  }

  loadStrategicRegionsForWindow(window: BrowserWindow, projectId: string) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) {
      throw new Error('Project session mismatch')
    }
    return session.loadStrategicRegions()
  }

  saveBmpForWindow(window: BrowserWindow, projectId: string, rgbaData: Uint8Array, width: number, height: number) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) throw new Error('Project session mismatch')
    return session.saveBmp(rgbaData, width, height)
  }

  saveDefinitionsForWindow(
    window: BrowserWindow,
    projectId: string,
    provinces: Province[],
    continents: Continent[],
    expectedHash: string
  ): DefinitionsSaveResult {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) throw new Error('Project session mismatch')
    return session.saveDefinitions(provinces, continents, expectedHash)
  }

  saveStatesForWindow(window: BrowserWindow, projectId: string, operations: StateSaveOperation[]) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) {
      throw new Error('Project session mismatch')
    }
    return session.saveStates(operations)
  }

  saveStrategicRegionsForWindow(window: BrowserWindow, projectId: string, operations: StrategicRegionSaveOperation[]) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) {
      throw new Error('Project session mismatch')
    }
    return session.saveStrategicRegions(operations)
  }

  loadWeatherEntriesForWindow(window: BrowserWindow, projectId: string): string[] {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) {
      throw new Error('Project session mismatch')
    }
    return session.loadWeatherEntries()
  }

  loadResourcesForWindow(window: BrowserWindow, projectId: string) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) {
      throw new Error('Project session mismatch')
    }
    return session.loadResources()
  }

  loadAdjacenciesForWindow(window: BrowserWindow, projectId: string) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) throw new Error('Project session mismatch')
    return session.loadAdjacencies()
  }

  loadSupplyNodesForWindow(window: BrowserWindow, projectId: string) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) throw new Error('Project session mismatch')
    return session.loadSupplyNodes()
  }

  loadRailwaysForWindow(window: BrowserWindow, projectId: string) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) throw new Error('Project session mismatch')
    return session.loadRailways()
  }
}
