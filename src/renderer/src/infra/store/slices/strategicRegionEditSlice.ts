import { type StateCreator } from 'zustand'
import type { StrategicRegionDefinition, WeatherPeriod } from '../../../../../shared/mapDataTypes'
import type { DatasetSlice } from './datasetSlice'

export interface StrategicRegionEditPatch {
  name?: string
  provinceIds?: number[]
  weatherPeriods?: WeatherPeriod[]
}

export interface StrategicRegionEditSlice {
  pendingStrategicRegionEdits: Map<number, StrategicRegionEditPatch>
  // Each edited region as it was when its first edit was made (see stateEditBaselines).
  strategicRegionEditBaselines: Map<number, StrategicRegionDefinition>
  editStrategicRegion: (id: number, patch: StrategicRegionEditPatch) => void
  revertStrategicRegionEdit: (id: number) => void
  clearStrategicRegionSavedChanges: () => void
  clearStrategicRegionPendingChanges: () => void
}

export const STRATEGIC_REGION_EDIT_EMPTY = {
  pendingStrategicRegionEdits: new Map<number, StrategicRegionEditPatch>(),
  strategicRegionEditBaselines: new Map<number, StrategicRegionDefinition>(),
}

type StrategicRegionEditStore = StrategicRegionEditSlice & Pick<DatasetSlice, 'strategicRegionsById'>

export const createStrategicRegionEditSlice: StateCreator<StrategicRegionEditStore, [], [], StrategicRegionEditSlice> = (set) => ({
  ...STRATEGIC_REGION_EDIT_EMPTY,

  editStrategicRegion: (id, patch) => set((state) => {
    const pendingStrategicRegionEdits = new Map(state.pendingStrategicRegionEdits)
    const existing = pendingStrategicRegionEdits.get(id) ?? {}
    pendingStrategicRegionEdits.set(id, { ...existing, ...patch })

    let strategicRegionEditBaselines = state.strategicRegionEditBaselines
    const current = state.strategicRegionsById.get(id)
    if (!strategicRegionEditBaselines.has(id) && current) {
      strategicRegionEditBaselines = new Map(strategicRegionEditBaselines)
      strategicRegionEditBaselines.set(id, current)
    }
    return { pendingStrategicRegionEdits, strategicRegionEditBaselines }
  }),

  revertStrategicRegionEdit: (id) => set((state) => {
    const pendingStrategicRegionEdits = new Map(state.pendingStrategicRegionEdits)
    pendingStrategicRegionEdits.delete(id)
    const strategicRegionEditBaselines = new Map(state.strategicRegionEditBaselines)
    strategicRegionEditBaselines.delete(id)
    return { pendingStrategicRegionEdits, strategicRegionEditBaselines }
  }),

  clearStrategicRegionSavedChanges: () => set({
    pendingStrategicRegionEdits: new Map<number, StrategicRegionEditPatch>(),
    strategicRegionEditBaselines: new Map<number, StrategicRegionDefinition>(),
  }),

  clearStrategicRegionPendingChanges: () => set({
    pendingStrategicRegionEdits: new Map<number, StrategicRegionEditPatch>(),
    strategicRegionEditBaselines: new Map<number, StrategicRegionDefinition>(),
  }),
})

export function applyStrategicRegionPatch(
  original: StrategicRegionDefinition,
  patch: StrategicRegionEditPatch
): StrategicRegionDefinition {
  return {
    ...original,
    name: patch.name ?? original.name,
    provinceIds: patch.provinceIds ?? original.provinceIds,
    weatherPeriods: patch.weatherPeriods ?? original.weatherPeriods,
  }
}
