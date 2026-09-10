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
  replaceStates: (states: StateDefinition[]) => void
  appendStates: (states: StateDefinition[]) => void
  patchStates: (sourcePath: string, states: StateDefinition[]) => void
  replaceStrategicRegions: (strategicRegions: StrategicRegionDefinition[]) => void
  appendStrategicRegions: (strategicRegions: StrategicRegionDefinition[]) => void
  patchStrategicRegions: (sourcePath: string, strategicRegions: StrategicRegionDefinition[]) => void
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
function buildStatesSlice(statesInput: StateDefinition[]) {
  const statesById = new Map<number, StateDefinition>()
  for (const state of statesInput) statesById.set(state.id, state)
  const states = [...statesById.values()].sort((a, b) => a.id - b.id)

  const stateProvinceToStateId = new Map<number, number>()
  for (const state of states) {
    for (const provinceId of state.provinceIds) stateProvinceToStateId.set(provinceId, state.id)
  }
  return { states, statesById, stateProvinceToStateId }
}

// See buildStatesSlice — same reasoning, same fix.
function buildStrategicRegionsSlice(strategicRegionsInput: StrategicRegionDefinition[]) {
  const strategicRegionsById = new Map<number, StrategicRegionDefinition>()
  for (const region of strategicRegionsInput) strategicRegionsById.set(region.id, region)
  const strategicRegions = [...strategicRegionsById.values()].sort((a, b) => a.id - b.id)

  const strategicRegionProvinceToRegionId = new Map<number, number>()
  for (const region of strategicRegions) {
    for (const provinceId of region.provinceIds) strategicRegionProvinceToRegionId.set(provinceId, region.id)
  }
  return { strategicRegions, strategicRegionsById, strategicRegionProvinceToRegionId }
}

export const createDatasetSlice: StateCreator<DatasetSlice, [], [], DatasetSlice> = (set) => ({
  ...DATASET_EMPTY,

  replaceStates: (incoming) => set((state) => ({
    ...buildStatesSlice(incoming),
    statesRevision: state.statesRevision + 1
  })),

  appendStates: (incoming) => set((state) => ({
    ...buildStatesSlice([...state.states, ...incoming]),
    statesRevision: state.statesRevision + 1
  })),

  patchStates: (sourcePath, incoming) => set((state) => ({
    ...buildStatesSlice([...state.states.filter((s) => s.sourcePath !== sourcePath), ...incoming]),
    statesRevision: state.statesRevision + 1
  })),

  replaceStrategicRegions: (incoming) => set((state) => ({
    ...buildStrategicRegionsSlice(incoming),
    strategicRegionsRevision: state.strategicRegionsRevision + 1
  })),

  appendStrategicRegions: (incoming) => set((state) => ({
    ...buildStrategicRegionsSlice([...state.strategicRegions, ...incoming]),
    strategicRegionsRevision: state.strategicRegionsRevision + 1
  })),

  patchStrategicRegions: (sourcePath, incoming) => set((state) => ({
    ...buildStrategicRegionsSlice([
      ...state.strategicRegions.filter((r) => r.sourcePath !== sourcePath),
      ...incoming,
    ]),
    strategicRegionsRevision: state.strategicRegionsRevision + 1
  })),

  setStatesStatus: (statesStatus) => set({ statesStatus }),

  setStrategicRegionsStatus: (strategicRegionsStatus) => set({ strategicRegionsStatus }),
})
