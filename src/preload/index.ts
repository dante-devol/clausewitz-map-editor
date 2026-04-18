import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getRecentProjects: (): Promise<string[]> => ipcRenderer.invoke('projects:getRecent'),
  addRecentProject: (path: string): Promise<void> => ipcRenderer.invoke('projects:addRecent', path),
  removeRecentProject: (path: string): Promise<void> => ipcRenderer.invoke('projects:removeRecent', path),
  openFolderDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  enterEditor: (): Promise<void> => ipcRenderer.invoke('window:enterEditor')
}

contextBridge.exposeInMainWorld('api', api)
