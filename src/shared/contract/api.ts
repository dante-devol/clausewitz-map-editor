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
    weather: string
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
  // Hash of definition.csv as parsed into `provinces`. Sent back on save so the
  // main process can refuse to overwrite a file that changed on disk since.
  definitionsHash: string
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
    | DefinitionsChangedData
    | TerrainCategory[]
    | StateCategory[]
    | Building[]
    | StateDatasetUpdate
    | StrategicRegionDatasetUpdate
    | ImageChangedData
}

export interface DefinitionsChangedData {
  provinces: Province[]
  hash: string
}

// 'external' patches come from the file watcher; 'save' patches re-publish a
// file this app just wrote (its sourcePath may have moved into the mod folder).
export type DatasetPatchOrigin = 'external' | 'save'

export interface StateDatasetUpdate {
  op: 'replace' | 'append' | 'patch'
  items: StateDefinition[]
  loadedFiles: number
  totalFiles: number
  sourcePath?: string
  origin?: DatasetPatchOrigin
}

export interface StrategicRegionDatasetUpdate {
  op: 'replace' | 'append' | 'patch'
  items: StrategicRegionDefinition[]
  loadedFiles: number
  totalFiles: number
  sourcePath?: string
  origin?: DatasetPatchOrigin
}

// `original` is the object as it was when editing began; `updated` is the
// desired result. The main process only writes fields that differ between the
// two, and rejects the save if one of those fields also changed on disk.
export interface StateSaveRequest {
  original: StateDefinition
  updated: StateDefinition
}

export interface StrategicRegionSaveRequest {
  original: StrategicRegionDefinition
  updated: StrategicRegionDefinition
}

export interface DefinitionsSaveResult {
  hash: string
}

export interface ImageChangedData {
  b64: string
  hash: string
}

// All display strings originate in the renderer (which owns i18n); main only
// shows the native dialog and reports which button was pressed.
export interface ConfirmDialogOptions {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
}

export interface ApiContract {
  app: {
    getSystemLocale: () => Promise<AppLocale>
  }
  dialogs: {
    openFolder: () => Promise<string | null>
    // Resolves true if the user picked confirmLabel, false for cancelLabel
    // (including closing the dialog without choosing).
    confirm: (options: ConfirmDialogOptions) => Promise<boolean>
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
    // Tears down the main-process session (file watchers, worker pool) for a
    // project the renderer is leaving, without waiting for a new project to
    // be opened or the window to close.
    close: (projectId: string) => Promise<void>
  }
  game: {
    getPath: () => Promise<string | null>
    setPath: (path: string) => Promise<void>
    verifyPath: (gamePath: string) => Promise<GameVerificationResult>
  }
  map: {
    load: (projectId: string) => Promise<MapDataSnapshot>
    save: (projectId: string, provinces: Province[], continents: Continent[], expectedHash: string) => Promise<DefinitionsSaveResult>
    saveStates: (projectId: string, requests: StateSaveRequest[]) => Promise<void>
    saveStrategicRegions: (projectId: string, requests: StrategicRegionSaveRequest[]) => Promise<void>
    loadStates: (projectId: string) => Promise<void>
    loadStrategicRegions: (projectId: string) => Promise<void>
    loadWeatherEntries: (projectId: string) => Promise<string[]>
    loadResources: (projectId: string) => Promise<Resource[]>
    onChanged: (callback: (event: MapChangedEvent) => void) => () => void
    saveBmp: (projectId: string, rgbaData: Uint8Array, width: number, height: number) => Promise<void>
  }
  settings: {
    get: () => Promise<AppConfig>
    getValue: <K extends keyof AppConfig>(key: K) => Promise<AppConfig[K]>
    set: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => Promise<void>
    reset: () => Promise<void>
  }
  window: {
    enterEditor: () => Promise<void>
    exitEditor: () => Promise<void>
    // Actually closes the window. Called once the renderer has decided it's
    // OK to (no unsaved changes, or the user chose to discard them) in
    // response to onBeforeClose.
    confirmClose: () => Promise<void>
    // Fires when the user tries to close the window; main withholds the
    // real close until confirmClose is called.
    onBeforeClose: (callback: () => void) => () => void
  }
}
