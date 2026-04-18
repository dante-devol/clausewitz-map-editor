export type SessionStatus =
  | 'idle'
  | 'opening-project'
  | 'project-open'
  | 'loading-map'
  | 'ready'
  | 'error'

export interface SessionLifecycle {
  status: SessionStatus
  projectId: string | null
  projectPath: string | null
  errorMessage: string | null
}

