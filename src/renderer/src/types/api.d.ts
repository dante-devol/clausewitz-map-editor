export {}

declare global {
  interface Window {
    api: {
      getRecentProjects: () => Promise<string[]>
      addRecentProject: (path: string) => Promise<void>
      removeRecentProject: (path: string) => Promise<void>
      openFolderDialog: () => Promise<string | null>
      enterEditor: () => Promise<void>
    }
  }
}
