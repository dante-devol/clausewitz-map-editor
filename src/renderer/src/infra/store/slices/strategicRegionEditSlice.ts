import { type StateCreator } from 'zustand'
import type { StrategicRegionDefinition, WeatherPeriod } from '../../../../../shared/mapDataTypes'
import type { DatasetSlice } from './datasetSlice'
import type { ProvinceEditSlice } from './provinceEditSlice'

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
  // Adds provinceIds to targetRegionId and removes them from whichever other
  // region effectively holds them — a province can only belong to one
  // strategic region at a time. targetRegionId of null unassigns the
  // provinces without assigning them anywhere else. Unknown province IDs are
  // ignored.
  moveProvincesToRegion: (provinceIds: number[], targetRegionId: number | null) => void
  revertStrategicRegionEdit: (id: number) => void
  clearStrategicRegionSavedChanges: () => void
  clearStrategicRegionPendingChanges: () => void
}

export const STRATEGIC_REGION_EDIT_EMPTY = {
  pendingStrategicRegionEdits: new Map<number, StrategicRegionEditPatch>(),
  strategicRegionEditBaselines: new Map<number, StrategicRegionDefinition>(),
}

type StrategicRegionEditStore = StrategicRegionEditSlice
  & Pick<DatasetSlice, 'strategicRegionsById'>
  & Pick<ProvinceEditSlice, 'originalDefinitions' | 'pendingNewProvinces'>

export const createStrategicRegionEditSlice: StateCreator<StrategicRegionEditStore, [], [], StrategicRegionEditSlice> = (set) => {
  // Shared by editStrategicRegion and moveProvincesToRegion.
  function patchRegion(
    state: StrategicRegionEditStore,
    pendingStrategicRegionEdits: Map<number, StrategicRegionEditPatch>,
    strategicRegionEditBaselines: Map<number, StrategicRegionDefinition>,
    id: number,
    patch: StrategicRegionEditPatch
  ): void {
    const existing = pendingStrategicRegionEdits.get(id) ?? {}
    pendingStrategicRegionEdits.set(id, { ...existing, ...patch })
    if (!strategicRegionEditBaselines.has(id)) {
      const current = state.strategicRegionsById.get(id)
      if (current) strategicRegionEditBaselines.set(id, current)
    }
  }

  return {
    ...STRATEGIC_REGION_EDIT_EMPTY,

    editStrategicRegion: (id, patch) => set((state) => {
      const pendingStrategicRegionEdits = new Map(state.pendingStrategicRegionEdits)
      const strategicRegionEditBaselines = new Map(state.strategicRegionEditBaselines)
      patchRegion(state, pendingStrategicRegionEdits, strategicRegionEditBaselines, id, patch)
      return { pendingStrategicRegionEdits, strategicRegionEditBaselines }
    }),

    moveProvincesToRegion: (provinceIds, targetRegionId) => set((state) => {
      const validIds = provinceIds.filter((id) =>
        state.originalDefinitions.has(id) || [...state.pendingNewProvinces.values()].includes(id)
      )
      if (validIds.length === 0) return {}
      const idSet = new Set(validIds)

      const pendingStrategicRegionEdits = new Map(state.pendingStrategicRegionEdits)
      const strategicRegionEditBaselines = new Map(state.strategicRegionEditBaselines)

      const effectiveProvinceIds = (regionId: number): number[] =>
        pendingStrategicRegionEdits.get(regionId)?.provinceIds ?? state.strategicRegionsById.get(regionId)?.provinceIds ?? []

      for (const other of state.strategicRegionsById.values()) {
        if (other.id === targetRegionId) continue
        const current = effectiveProvinceIds(other.id)
        const filtered = current.filter((id) => !idSet.has(id))
        if (filtered.length === current.length) continue
        patchRegion(state, pendingStrategicRegionEdits, strategicRegionEditBaselines, other.id, { provinceIds: filtered })
      }

      if (targetRegionId !== null) {
        const targetCurrent = effectiveProvinceIds(targetRegionId)
        const targetSet = new Set(targetCurrent)
        const additions = validIds.filter((id) => !targetSet.has(id))
        if (additions.length > 0) {
          patchRegion(state, pendingStrategicRegionEdits, strategicRegionEditBaselines, targetRegionId, {
            provinceIds: [...targetCurrent, ...additions]
          })
        }
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
  }
}

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
