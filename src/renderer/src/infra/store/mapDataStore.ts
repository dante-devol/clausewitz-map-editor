import { create } from 'zustand'
import type {
  Province,
  StateDefinition,
  StrategicRegionDefinition,
  TerrainCategory,
  Continent
} from '../../../../shared/mapDataTypes'
import type { ProvinceCatalogEntry } from '../../../../shared/provinceCatalog'
import type {
  BmpOnlyEntry,
  ReassignmentAction,
  SelectionOrigin
} from '../../../../shared/provinceEditing'

interface MapDataState {
  // Primary lookups
  provinces: Map<number, Province>          // id → Province
  provincesByColor: Map<number, number>     // ProvinceColor → Province id
  baseProvinceCatalog: ProvinceCatalogEntry[]
  provinceCatalog: ProvinceCatalogEntry[]
  terrains: Map<string, TerrainCategory>   // codeName → TerrainCategory
  continents: Map<string, Continent>        // codeName → Continent
  states: StateDefinition[]
  statesById: Map<number, StateDefinition>
  stateProvinceToStateId: Map<number, number>
  statesStatus: 'idle' | 'loading' | 'ready' | 'error'
  strategicRegions: StrategicRegionDefinition[]
  strategicRegionsById: Map<number, StrategicRegionDefinition>
  strategicRegionProvinceToRegionId: Map<number, number>
  strategicRegionsStatus: 'idle' | 'loading' | 'ready' | 'error'

  // Raw provinces.bmp image, base64-encoded
  provincesImageB64: string | null
  provinceBitmapStatus: 'idle' | 'loading' | 'ready' | 'error'

  // Province editing state — stable for the session, not reset on file-watch reloads
  originalDefinitions: Map<number, Province>
  bmpOnlyEntries: BmpOnlyEntry[]
  bmpOnlyByColor: Map<number, string>          // color → guid
  pendingEdits: Map<number, Partial<Province>> // province id → field patch
  pendingReassignments: Map<string, ReassignmentAction> // guid → action
  provinceSelection: SelectionOrigin | null

  // Bulk loaders — replace the entire table at once
  loadProvinces: (provinces: Province[]) => void
  loadProvinceCatalog: (catalog: ProvinceCatalogEntry[]) => void
  setProvinceCatalog: (catalog: ProvinceCatalogEntry[]) => void
  loadTerrains: (terrains: TerrainCategory[]) => void
  loadContinents: (continents: Continent[]) => void
  replaceStates: (states: StateDefinition[]) => void
  appendStates: (states: StateDefinition[]) => void
  replaceStrategicRegions: (strategicRegions: StrategicRegionDefinition[]) => void
  appendStrategicRegions: (strategicRegions: StrategicRegionDefinition[]) => void
  loadProvincesImage: (b64: string) => void
  setStatesStatus: (status: 'idle' | 'loading' | 'ready' | 'error') => void
  setStrategicRegionsStatus: (status: 'idle' | 'loading' | 'ready' | 'error') => void
  setProvinceBitmapStatus: (status: 'idle' | 'loading' | 'ready' | 'error') => void
  // Editing actions
  loadOriginalDefinitions: (provinces: Province[]) => void
  syncBmpOnlyEntries: (colors: number[]) => void
  editProvince: (id: number, patch: Partial<Province>) => void
  revertEdit: (id: number) => void
  assignBmpProvince: (guid: string, action: ReassignmentAction) => void
  revertReassignment: (guid: string) => void
  setProvinceSelection: (origin: SelectionOrigin | null) => void
  clear: () => void
}

function shortGuid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8)
}

const EMPTY_STATE = {
  provinces: new Map<number, Province>(),
  provincesByColor: new Map<number, number>(),
  baseProvinceCatalog: [] as ProvinceCatalogEntry[],
  provinceCatalog: [] as ProvinceCatalogEntry[],
  terrains: new Map<string, TerrainCategory>(),
  continents: new Map<string, Continent>(),
  states: [] as StateDefinition[],
  statesById: new Map<number, StateDefinition>(),
  stateProvinceToStateId: new Map<number, number>(),
  statesStatus: 'idle' as const,
  strategicRegions: [] as StrategicRegionDefinition[],
  strategicRegionsById: new Map<number, StrategicRegionDefinition>(),
  strategicRegionProvinceToRegionId: new Map<number, number>(),
  strategicRegionsStatus: 'idle' as const,
  provincesImageB64: null as string | null,
  provinceBitmapStatus: 'idle' as const,
  originalDefinitions: new Map<number, Province>(),
  bmpOnlyEntries: [] as BmpOnlyEntry[],
  bmpOnlyByColor: new Map<number, string>(),
  pendingEdits: new Map<number, Partial<Province>>(),
  pendingReassignments: new Map<string, ReassignmentAction>(),
  provinceSelection: null as SelectionOrigin | null
}

export const useMapDataStore = create<MapDataState>((set) => ({
  ...EMPTY_STATE,

  loadProvinces: (incoming) => {
    const provinces = new Map<number, Province>()
    const provincesByColor = new Map<number, number>()
    for (const p of incoming) {
      provinces.set(p.id, p)
      provincesByColor.set(p.color, p.id)
    }
    set({ provinces, provincesByColor })
  },

  loadProvinceCatalog: (provinceCatalog) => set({
    baseProvinceCatalog: provinceCatalog,
    provinceCatalog
  }),

  setProvinceCatalog: (provinceCatalog) => set({ provinceCatalog }),

  loadTerrains: (incoming) => {
    const terrains = new Map<string, TerrainCategory>()
    for (const t of incoming) terrains.set(t.codeName, t)
    set({ terrains })
  },

  loadContinents: (incoming) => {
    const continents = new Map<string, Continent>()
    for (const c of incoming) continents.set(c.codeName, c)
    set({ continents })
  },

  replaceStates: (incoming) => set(buildStatesSlice(incoming)),

  appendStates: (incoming) => set((state) => buildStatesSlice([...state.states, ...incoming])),

  replaceStrategicRegions: (incoming) => set(buildStrategicRegionsSlice(incoming)),

  appendStrategicRegions: (incoming) => set((state) => buildStrategicRegionsSlice([...state.strategicRegions, ...incoming])),

  loadProvincesImage: (b64) => set({ provincesImageB64: b64 }),

  setStatesStatus: (statesStatus) => set({ statesStatus }),

  setStrategicRegionsStatus: (strategicRegionsStatus) => set({ strategicRegionsStatus }),

  setProvinceBitmapStatus: (provinceBitmapStatus) => set({ provinceBitmapStatus }),

  loadOriginalDefinitions: (incoming) => {
    const originalDefinitions = new Map<number, Province>()
    for (const p of incoming) originalDefinitions.set(p.id, p)
    set({ originalDefinitions })
  },

  syncBmpOnlyEntries: (colors) => set((state) => {
    const bmpOnlyByColor = new Map(state.bmpOnlyByColor)
    const bmpOnlyEntries = [...state.bmpOnlyEntries]
    for (const color of colors) {
      if (!bmpOnlyByColor.has(color)) {
        const guid = shortGuid()
        bmpOnlyByColor.set(color, guid)
        bmpOnlyEntries.push({ guid, color })
      }
    }
    return { bmpOnlyByColor, bmpOnlyEntries }
  }),

  editProvince: (id, patch) => set((state) => {
    const pendingEdits = new Map(state.pendingEdits)
    const existing = pendingEdits.get(id) ?? {}
    pendingEdits.set(id, { ...existing, ...patch })
    return { pendingEdits }
  }),

  revertEdit: (id) => set((state) => {
    const pendingEdits = new Map(state.pendingEdits)
    pendingEdits.delete(id)
    return { pendingEdits }
  }),

  assignBmpProvince: (guid, action) => set((state) => {
    const pendingReassignments = new Map(state.pendingReassignments)
    pendingReassignments.set(guid, action)
    return { pendingReassignments }
  }),

  revertReassignment: (guid) => set((state) => {
    const pendingReassignments = new Map(state.pendingReassignments)
    pendingReassignments.delete(guid)
    return { pendingReassignments }
  }),

  setProvinceSelection: (provinceSelection) => set({ provinceSelection }),

  clear: () => set({ ...EMPTY_STATE })
}))

function buildStatesSlice(statesInput: StateDefinition[]) {
  const states = [...statesInput].sort((a, b) => a.id - b.id)
  const statesById = new Map<number, StateDefinition>()
  const stateProvinceToStateId = new Map<number, number>()
  for (const state of states) {
    statesById.set(state.id, state)
    for (const provinceId of state.provinceIds) stateProvinceToStateId.set(provinceId, state.id)
  }
  return { states, statesById, stateProvinceToStateId }
}

function buildStrategicRegionsSlice(strategicRegionsInput: StrategicRegionDefinition[]) {
  const strategicRegions = [...strategicRegionsInput].sort((a, b) => a.id - b.id)
  const strategicRegionsById = new Map<number, StrategicRegionDefinition>()
  const strategicRegionProvinceToRegionId = new Map<number, number>()
  for (const region of strategicRegions) {
    strategicRegionsById.set(region.id, region)
    for (const provinceId of region.provinceIds) strategicRegionProvinceToRegionId.set(provinceId, region.id)
  }
  return { strategicRegions, strategicRegionsById, strategicRegionProvinceToRegionId }
}
