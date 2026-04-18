import type { Continent, Province, TerrainCategory } from '../mapDataTypes'
import type { GameVerificationResult, ModVerificationResult, ResolvedPaths } from '../pathTypes'
import type { AppLocale } from '../i18n'

export interface AppConfig {
  locale: AppLocale | null
  paths: {
    defaultMap: string
    definitions: string
    provinces: string
    continent: string
    provinceTerrain: string
  }
  displayModeOverrides: Partial<Record<string, Partial<Record<string, string>>>>
}

export interface FileLoadResult {
  path: string
  hash: string
  content: string
}

export interface FileChangedEvent {
  path: string
  hash: string
}

export interface MapDataSnapshot {
  continents: Continent[]
  provinces: Province[]
  terrains: TerrainCategory[]
  provincesImageB64: string
}

export interface ProjectOpenRequest {
  gamePath: string
  modPath: string
}

export interface ProjectOpenResult {
  projectId: string
  resolvedPaths: ResolvedPaths
}

export interface MapChangedEvent {
  projectId: string
  type: 'continents' | 'definitions' | 'terrain' | 'image'
  data: Continent[] | Province[] | TerrainCategory[] | string
}

export interface ApiContract {
  app: {
    getSystemLocale: () => Promise<AppLocale>
  }
  dialogs: {
    openFolder: () => Promise<string | null>
  }
  files: {
    load: (path: string) => Promise<FileLoadResult>
    read: (path: string) => Promise<FileLoadResult>
    unload: (path: string) => Promise<void>
    getHash: (path: string) => Promise<string | null>
    onChanged: (callback: (event: FileChangedEvent) => void) => () => void
  }
  projects: {
    getRecent: () => Promise<string[]>
    addRecent: (path: string) => Promise<void>
    removeRecent: (path: string) => Promise<void>
    verifyModPath: (modPath: string) => Promise<ModVerificationResult>
    open: (request: ProjectOpenRequest) => Promise<ProjectOpenResult>
  }
  game: {
    getPath: () => Promise<string | null>
    setPath: (path: string) => Promise<void>
    verifyPath: (gamePath: string) => Promise<GameVerificationResult>
  }
  map: {
    load: (projectId: string) => Promise<MapDataSnapshot>
    onChanged: (callback: (event: MapChangedEvent) => void) => () => void
  }
  settings: {
    get: () => Promise<AppConfig>
    getValue: <K extends keyof AppConfig>(key: K) => Promise<AppConfig[K]>
    set: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => Promise<void>
    reset: () => Promise<void>
  }
  window: {
    enterEditor: () => Promise<void>
  }
}
