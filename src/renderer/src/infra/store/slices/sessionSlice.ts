import { type StateCreator } from 'zustand'

export type SessionStatus =
  | 'idle'
  | 'opening-project'
  | 'project-open'
  | 'loading-map'
  | 'ready'
  | 'error'

export interface SessionSlice {
  sessionStatus: SessionStatus
  projectId: string | null
  projectPath: string | null
  sessionErrorMessage: string | null
  openProjectStarted: (projectPath: string) => void
  projectOpened: (projectId: string, projectPath: string) => void
  mapLoadingStarted: () => void
  mapReady: () => void
  sessionFailed: (message: string) => void
  sessionCleared: () => void
}

export const SESSION_EMPTY = {
  sessionStatus: 'idle' as SessionStatus,
  projectId: null as string | null,
  projectPath: null as string | null,
  sessionErrorMessage: null as string | null,
}

export const createSessionSlice: StateCreator<SessionSlice, [], [], SessionSlice> = (set) => ({
  ...SESSION_EMPTY,

  openProjectStarted: (projectPath) => set({
    sessionStatus: 'opening-project',
    projectId: null,
    projectPath,
    sessionErrorMessage: null,
  }),

  projectOpened: (projectId, projectPath) => set({
    sessionStatus: 'project-open',
    projectId,
    projectPath,
    sessionErrorMessage: null,
  }),

  mapLoadingStarted: () => set((s) => ({
    sessionStatus: 'loading-map',
    sessionErrorMessage: null,
    projectId: s.projectId,
    projectPath: s.projectPath,
  })),

  mapReady: () => set((s) => ({
    sessionStatus: 'ready',
    sessionErrorMessage: null,
    projectId: s.projectId,
    projectPath: s.projectPath,
  })),

  sessionFailed: (message) => set((s) => ({
    sessionStatus: 'error',
    sessionErrorMessage: message,
    projectId: s.projectId,
    projectPath: s.projectPath,
  })),

  sessionCleared: () => set(SESSION_EMPTY),
})
