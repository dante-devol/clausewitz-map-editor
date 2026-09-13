import { type StateCreator } from 'zustand'
import type { StateDefinition, StrategicRegionDefinition } from '../../../../../shared/mapDataTypes'

export interface DatasetSlice {
  states: StateDefinition[]
  statesById: Map<number, StateDefinition>
  stateProvinceToStateId: Map<number, number>
  statesStatus: 'idle' | 'loading' | 'ready' | 'error'
  statesRevision: number
  strategicRegions: StrategicRegionDefinition[]
  strategicRegionsById: Map<number, StrategicRegionDefinition>
  strategicRegionProvinceToRegionId: Map<number, number>
  strategicRegionsStatus: 'idle' | 'loading' | 'ready' | 'error'
  strategicRegionsRevision: number
  // `localisationEntries`, where given, seeds `displayName` for the incoming
  // items immediately (loc key -> resolved text), covering the case where
  // localisation already resolved before these items arrived.
  replaceStates: (states: StateDefinition[], localisationEntries?: Record<string, string>) => void
  appendStates: (states: StateDefinition[], localisationEntries?: Record<string, string>) => void
  patchStates: (sourcePath: string, states: StateDefinition[], localisationEntries?: Record<string, string>) => void
  replaceStrategicRegions: (strategicRegions: StrategicRegionDefinition[], localisationEntries?: Record<string, string>) => void
  appendStrategicRegions: (strategicRegions: StrategicRegionDefinition[], localisationEntries?: Record<string, string>) => void
  patchStrategicRegions: (sourcePath: string, strategicRegions: StrategicRegionDefinition[], localisationEntries?: Record<string, string>) => void
  // Upgrades displayName on already-loaded states/regions whose loc key was
  // just resolved. Does not touch statesRevision/strategicRegionsRevision —
  // geometry/membership is unaffected, so overlay bitmaps must not rebuild.
  applyLocalisation: (entries: Record<string, string>) => void
  setStatesStatus: (status: 'idle' | 'loading' | 'ready' | 'error') => void
  setStrategicRegionsStatus: (status: 'idle' | 'loading' | 'ready' | 'error') => void
}

export const DATASET_EMPTY = {
  states: [] as StateDefinition[],
  statesById: new Map<number, StateDefinition>(),
  stateProvinceToStateId: new Map<number, number>(),
  statesStatus: 'idle' as const,
  statesRevision: 0,
  strategicRegions: [] as StrategicRegionDefinition[],
  strategicRegionsById: new Map<number, StrategicRegionDefinition>(),
  strategicRegionProvinceToRegionId: new Map<number, number>(),
  strategicRegionsStatus: 'idle' as const,
  strategicRegionsRevision: 0,
}

// A mod's state file can coexist with the game's own file for the same state
// ID under a different filename (the folder merge in pathResolver.ts only
// dedupes by filename) — both get loaded. Building statesById first and
// deriving the states array from it, rather than sorting the raw input list,
// guarantees the two can never disagree on which (and how many) states there
// are; whichever entry is set last for an ID wins, same as the map.
function buildStatesSlice(statesInput: StateDefinition[], localisationEntries: Record<string, string> = {}) {
  const statesById = new Map<number, StateDefinition>()
  for (const state of statesInput) {
    const resolved = localisationEntries[state.name]
    statesById.set(state.id, resolved !== undefined && resolved !== state.displayName ? { ...state, displayName: resolved } : state)
  }
  const states = [...statesById.values()].sort((a, b) => a.id - b.id)

  const stateProvinceToStateId = new Map<number, number>()
  for (const state of states) {
    for (const provinceId of state.provinceIds) stateProvinceToStateId.set(provinceId, state.id)
  }
  return { states, statesById, stateProvinceToStateId }
}

// See buildStatesSlice — same reasoning, same fix.
function buildStrategicRegionsSlice(strategicRegionsInput: StrategicRegionDefinition[], localisationEntries: Record<string, string> = {}) {
  const strategicRegionsById = new Map<number, StrategicRegionDefinition>()
  for (const region of strategicRegionsInput) {
    const resolved = localisationEntries[region.name]
    strategicRegionsById.set(region.id, resolved !== undefined && resolved !== region.displayName ? { ...region, displayName: resolved } : region)
  }
  const strategicRegions = [...strategicRegionsById.values()].sort((a, b) => a.id - b.id)

  const strategicRegionProvinceToRegionId = new Map<number, number>()
  for (const region of strategicRegions) {
    for (const provinceId of region.provinceIds) strategicRegionProvinceToRegionId.set(provinceId, region.id)
  }
  return { strategicRegions, strategicRegionsById, strategicRegionProvinceToRegionId }
}

export const createDatasetSlice: StateCreator<DatasetSlice, [], [], DatasetSlice> = (set) => ({
  ...DATASET_EMPTY,

  replaceStates: (incoming, localisationEntries) => set((state) => ({
    ...buildStatesSlice(incoming, localisationEntries),
    statesRevision: state.statesRevision + 1
  })),

  appendStates: (incoming, localisationEntries) => set((state) => ({
    ...buildStatesSlice([...state.states, ...incoming], localisationEntries),
    statesRevision: state.statesRevision + 1
  })),

  patchStates: (sourcePath, incoming, localisationEntries) => set((state) => ({
    ...buildStatesSlice([...state.states.filter((s) => s.sourcePath !== sourcePath), ...incoming], localisationEntries),
    statesRevision: state.statesRevision + 1
  })),

  replaceStrategicRegions: (incoming, localisationEntries) => set((state) => ({
    ...buildStrategicRegionsSlice(incoming, localisationEntries),
    strategicRegionsRevision: state.strategicRegionsRevision + 1
  })),

  appendStrategicRegions: (incoming, localisationEntries) => set((state) => ({
    ...buildStrategicRegionsSlice([...state.strategicRegions, ...incoming], localisationEntries),
    strategicRegionsRevision: state.strategicRegionsRevision + 1
  })),

  patchStrategicRegions: (sourcePath, incoming, localisationEntries) => set((state) => ({
    ...buildStrategicRegionsSlice([
      ...state.strategicRegions.filter((r) => r.sourcePath !== sourcePath),
      ...incoming,
    ], localisationEntries),
    strategicRegionsRevision: state.strategicRegionsRevision + 1
  })),

  // Only patches items whose resolved text actually changed, and skips the
  // update entirely if none did — a localisation batch for keys that don't
  // belong to anything currently loaded is a no-op. Deliberately does not
  // bump statesRevision/strategicRegionsRevision: province membership is
  // unaffected, so this must not trigger an overlay bitmap rebuild.
  applyLocalisation: (entries) => set((state) => {
    let statesChanged = false
    const states = state.states.map((s) => {
      const resolved = entries[s.name]
      if (resolved === undefined || resolved === s.displayName) return s
      statesChanged = true
      return { ...s, displayName: resolved }
    })

    let regionsChanged = false
    const strategicRegions = state.strategicRegions.map((r) => {
      const resolved = entries[r.name]
      if (resolved === undefined || resolved === r.displayName) return r
      regionsChanged = true
      return { ...r, displayName: resolved }
    })

    if (!statesChanged && !regionsChanged) return {}
    return {
      ...(statesChanged ? { states, statesById: new Map(states.map((s) => [s.id, s])) } : {}),
      ...(regionsChanged ? { strategicRegions, strategicRegionsById: new Map(strategicRegions.map((r) => [r.id, r])) } : {}),
    }
  }),

  setStatesStatus: (statesStatus) => set({ statesStatus }),

  setStrategicRegionsStatus: (strategicRegionsStatus) => set({ strategicRegionsStatus }),
})
