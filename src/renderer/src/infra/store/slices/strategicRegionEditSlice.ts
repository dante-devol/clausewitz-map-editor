import { type StateCreator } from 'zustand'
import type { StrategicRegionDefinition, WeatherPeriod } from '../../../../../shared/mapDataTypes'

export interface StrategicRegionEditPatch {
  name?: string
  provinceIds?: number[]
  weatherPeriods?: WeatherPeriod[]
}

export interface StrategicRegionEditSlice {
  pendingStrategicRegionEdits: Map<number, StrategicRegionEditPatch>
  editStrategicRegion: (id: number, patch: StrategicRegionEditPatch) => void
  revertStrategicRegionEdit: (id: number) => void
  clearStrategicRegionSavedChanges: () => void
  clearStrategicRegionPendingChanges: () => void
}

export const STRATEGIC_REGION_EDIT_EMPTY = {
  pendingStrategicRegionEdits: new Map<number, StrategicRegionEditPatch>(),
}

export const createStrategicRegionEditSlice: StateCreator<StrategicRegionEditSlice, [], [], StrategicRegionEditSlice> = (set) => ({
  ...STRATEGIC_REGION_EDIT_EMPTY,

  editStrategicRegion: (id, patch) => set((state) => {
    const pendingStrategicRegionEdits = new Map(state.pendingStrategicRegionEdits)
    const existing = pendingStrategicRegionEdits.get(id) ?? {}
    pendingStrategicRegionEdits.set(id, { ...existing, ...patch })
    return { pendingStrategicRegionEdits }
  }),

  revertStrategicRegionEdit: (id) => set((state) => {
    const pendingStrategicRegionEdits = new Map(state.pendingStrategicRegionEdits)
    pendingStrategicRegionEdits.delete(id)
    return { pendingStrategicRegionEdits }
  }),

  clearStrategicRegionSavedChanges: () => set({
    pendingStrategicRegionEdits: new Map<number, StrategicRegionEditPatch>(),
  }),

  clearStrategicRegionPendingChanges: () => set({
    pendingStrategicRegionEdits: new Map<number, StrategicRegionEditPatch>(),
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
