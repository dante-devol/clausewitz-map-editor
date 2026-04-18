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

export { GameVerificationResult, ModVerificationResult, ResolvedPaths } from '../../../shared/pathTypes'

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

      // Game path
      getGamePath: () => Promise<string | null>
      setGamePath: (path: string) => Promise<void>

      // Path verification & resolution
      verifyGamePaths: (gamePath: string) => Promise<import('../../../shared/pathTypes').GameVerificationResult>
      verifyModPaths: (modPath: string) => Promise<import('../../../shared/pathTypes').ModVerificationResult>
      resolvePaths: (gamePath: string, modPath: string) => Promise<import('../../../shared/pathTypes').ResolvedPaths>

      // Data loading
      loadContinents: (filePath: string) => Promise<import('../../../shared/mapDataTypes').Continent[]>
      loadDefinitions: (filePath: string, continents: import('../../../shared/mapDataTypes').Continent[]) => Promise<import('../../../shared/mapDataTypes').Province[]>
      loadTerrain: (filePaths: string[]) => Promise<import('../../../shared/mapDataTypes').TerrainCategory[]>

      // Config
      getConfig: () => Promise<Record<string, unknown>>
      getConfigValue: (key: string) => Promise<unknown>
      setConfigValue: (key: string, value: unknown) => Promise<void>
      resetConfig: () => Promise<void>

      // Push events
      onFileChanged: (callback: (data: FileChangedEvent) => void) => () => void
    }
  }
}
