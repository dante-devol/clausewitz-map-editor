export const sessionCommands = {
  openProjectStarted: (projectPath: string) => ({
    type: 'session/openProjectStarted' as const,
    projectPath
  }),
  projectOpened: (projectId: string, projectPath: string) => ({
    type: 'session/projectOpened' as const,
    projectId,
    projectPath
  }),
  mapLoadingStarted: () => ({ type: 'session/mapLoadingStarted' as const }),
  mapReady: () => ({ type: 'session/mapReady' as const }),
  failed: (message: string) => ({ type: 'session/failed' as const, message }),
  cleared: () => ({ type: 'session/cleared' as const })
}

