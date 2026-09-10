import type { BrowserWindow } from 'electron'
import { ProjectLoader } from './ProjectLoader'
import { ProjectSession } from './ProjectSession'
import type {
  DefinitionsSaveResult,
  ProjectOpenRequest,
  ProjectOpenResult,
  StateSaveRequest,
  StrategicRegionSaveRequest
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

  saveStatesForWindow(window: BrowserWindow, projectId: string, requests: StateSaveRequest[]) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) {
      throw new Error('Project session mismatch')
    }
    return session.saveStates(requests)
  }

  saveStrategicRegionsForWindow(window: BrowserWindow, projectId: string, requests: StrategicRegionSaveRequest[]) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) {
      throw new Error('Project session mismatch')
    }
    return session.saveStrategicRegions(requests)
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
}
