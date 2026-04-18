export {}

export interface FileLoadResult {
  path: string
  hash: string
  content: string // base64-encoded
}

export interface FileChangedEvent {
  path: string
  hash: string
}

declare global {
  interface Window {
    api: {
      // Projects
      getRecentProjects: () => Promise<string[]>
      addRecentProject: (path: string) => Promise<void>
      removeRecentProject: (path: string) => Promise<void>
      openFolderDialog: () => Promise<string | null>
      enterEditor: () => Promise<void>

      // Files
      loadFile: (path: string) => Promise<FileLoadResult>
      readFile: (path: string) => Promise<FileLoadResult>
      unloadFile: (path: string) => Promise<void>
      getFileHash: (path: string) => Promise<string | null>

      // Push events
      onFileChanged: (callback: (data: FileChangedEvent) => void) => () => void
    }
  }
}
