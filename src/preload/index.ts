import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Projects
  getRecentProjects: (): Promise<string[]> => ipcRenderer.invoke('projects:getRecent'),
  addRecentProject: (path: string): Promise<void> => ipcRenderer.invoke('projects:addRecent', path),
  removeRecentProject: (path: string): Promise<void> => ipcRenderer.invoke('projects:removeRecent', path),
  openFolderDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  enterEditor: (): Promise<void> => ipcRenderer.invoke('window:enterEditor'),

  // Files
  loadFile: (path: string): Promise<FileLoadResult> => ipcRenderer.invoke('file:load', path),
  readFile: (path: string): Promise<FileLoadResult> => ipcRenderer.invoke('file:read', path),
  unloadFile: (path: string): Promise<void> => ipcRenderer.invoke('file:unload', path),
  getFileHash: (path: string): Promise<string | null> => ipcRenderer.invoke('file:getHash', path),

  // Push events from main → renderer
  onFileChanged: (callback: (data: FileChangedEvent) => void) => {
    ipcRenderer.on('file:changed', (_e, data) => callback(data))
    // Return a cleanup function
    return () => ipcRenderer.removeAllListeners('file:changed')
  }
}

contextBridge.exposeInMainWorld('api', api)

// Types are inline here so the contextBridge closure captures them at preload compile time.
interface FileLoadResult {
  path: string
  hash: string
  content: string // base64
}

interface FileChangedEvent {
  path: string
  hash: string
}
