import type {
  Building,
  Continent,
  Province,
  Resource,
  StateCategory,
  StateDefinition,
  StrategicRegionDefinition,
  TerrainCategory
} from '../mapDataTypes'
import type { ProvinceCatalogEntry } from '../provinceCatalog'
import type { GameVerificationResult, ModVerificationResult, ResolvedPaths } from '../pathTypes'
import type { AppLocale } from '../i18n'

export interface AppConfig {
  locale: AppLocale | null
  paths: {
    descriptor: string
    defaultMap: string
    definitions: string
    provinces: string
    continent: string
    provinceTerrain: string
    states: string
    strategicRegions: string
    rivers: string
    stateCategories: string
    resources: string
    buildings: string
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
  provinceCatalog: ProvinceCatalogEntry[]
  terrains: TerrainCategory[]
  stateCategories: StateCategory[]
  buildings: Building[]
  provincesImageB64: string
  provincesImageHash: string
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
  type: 'continents' | 'definitions' | 'terrain' | 'image' | 'states' | 'strategicRegions' | 'stateCategories' | 'buildings'
  data:
    | Continent[]
    | Province[]
    | TerrainCategory[]
    | StateCategory[]
    | Building[]
    | StateDatasetUpdate
    | StrategicRegionDatasetUpdate
    | ImageChangedData
}

export interface StateDatasetUpdate {
  op: 'replace' | 'append'
  items: StateDefinition[]
  loadedFiles: number
  totalFiles: number
}

export interface StrategicRegionDatasetUpdate {
  op: 'replace' | 'append'
  items: StrategicRegionDefinition[]
  loadedFiles: number
  totalFiles: number
}

export interface ImageChangedData {
  b64: string
  hash: string
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
    save: (projectId: string, provinces: Province[], continents: Continent[]) => Promise<void>
    loadStates: (projectId: string) => Promise<void>
    loadStrategicRegions: (projectId: string) => Promise<void>
    loadResources: (projectId: string) => Promise<Resource[]>
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
