import type { BrowserWindow } from 'electron'
import { ProjectLoader } from './ProjectLoader'
import { ProjectSession } from './ProjectSession'
import type { ProjectOpenRequest, ProjectOpenResult } from '../../../shared/contract/api'
import type { LoadedProject } from './ProjectLoader'
import type { StateDefinition } from '../../../shared/mapDataTypes'

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

  saveStatesForWindow(window: BrowserWindow, projectId: string, states: StateDefinition[]) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) {
      throw new Error('Project session mismatch')
    }
    return session.saveStates(states)
  }

  loadResourcesForWindow(window: BrowserWindow, projectId: string) {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) {
      throw new Error('Project session mismatch')
    }
    return session.loadResources()
  }

  projectForWindow(window: BrowserWindow, projectId: string): LoadedProject {
    const session = this.forWindow(window)
    if (session.projectId !== projectId) {
      throw new Error('Project session mismatch')
    }
    return session.requireProject()
  }
}
