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

  // Game path
  getGamePath: (): Promise<string | null> => ipcRenderer.invoke('gamePath:get'),
  setGamePath: (path: string): Promise<void> => ipcRenderer.invoke('gamePath:set', path),

  // Path verification & resolution
  verifyGamePaths: (gamePath: string): Promise<GameVerificationResult> => ipcRenderer.invoke('paths:verifyGame', gamePath),
  verifyModPaths: (modPath: string): Promise<ModVerificationResult> => ipcRenderer.invoke('paths:verifyMod', modPath),
  resolvePaths: (gamePath: string, modPath: string): Promise<ResolvedPaths> => ipcRenderer.invoke('paths:resolve', gamePath, modPath),

  // Data loading
  loadContinents: (filePath: string): Promise<ContinentData[]> => ipcRenderer.invoke('data:loadContinents', filePath),
  loadDefinitions: (filePath: string, continents: ContinentData[]): Promise<ProvinceData[]> => ipcRenderer.invoke('data:loadDefinitions', filePath, continents),
  loadTerrain: (filePaths: string[]): Promise<TerrainData[]> => ipcRenderer.invoke('data:loadTerrain', filePaths),

  // Config
  getConfig: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('config:get'),
  getConfigValue: (key: string): Promise<unknown> => ipcRenderer.invoke('config:getValue', key),
  setConfigValue: (key: string, value: unknown): Promise<void> => ipcRenderer.invoke('config:set', key, value),
  resetConfig: (): Promise<void> => ipcRenderer.invoke('config:reset'),

  // Push events from main → renderer
  onFileChanged: (callback: (data: FileChangedEvent) => void) => {
    ipcRenderer.on('file:changed', (_e, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('file:changed')
  },

  onDataReloaded: (callback: (data: DataReloadedEvent) => void) => {
    ipcRenderer.on('data:reloaded', (_e, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('data:reloaded')
  }
}

contextBridge.exposeInMainWorld('api', api)

// Types are inline here so the contextBridge closure captures them at preload compile time.
interface ContinentData { codeName: string; position: number; color: number }
interface ProvinceData { id: number; color: number; type: string; isCoastal: boolean; terrain: string; continent: string }
interface TerrainData { codeName: string; color: number }

interface GameVerificationResult { valid: boolean; missingPaths: string[] }
interface ModVerificationResult { hasAny: boolean; foundPaths: string[]; missingPaths: string[] }
interface ResolvedPaths { defaultMap: string; definitions: string; provinces: string; continent: string; provinceTerrain: string[] }

interface DataReloadedEvent { type: 'continents' | 'definitions' | 'terrain'; data: unknown }

interface FileLoadResult {
  path: string
  hash: string
  content: string // base64
}

interface FileChangedEvent {
  path: string
  hash: string
}
