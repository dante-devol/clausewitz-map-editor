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
  replaceStrategicRegions: (strategicRegions: StrategicRegionDefinition[]) => void
  appendStrategicRegions: (strategicRegions: StrategicRegionDefinition[]) => void
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

  replaceStrategicRegions: (incoming) => set((state) => ({
    ...buildStrategicRegionsSlice(incoming),
    strategicRegionsRevision: state.strategicRegionsRevision + 1
  })),

  appendStrategicRegions: (incoming) => set((state) => ({
    ...buildStrategicRegionsSlice([...state.strategicRegions, ...incoming]),
    strategicRegionsRevision: state.strategicRegionsRevision + 1
  })),

  setStatesStatus: (statesStatus) => set({ statesStatus }),

  setStrategicRegionsStatus: (strategicRegionsStatus) => set({ strategicRegionsStatus }),
})
