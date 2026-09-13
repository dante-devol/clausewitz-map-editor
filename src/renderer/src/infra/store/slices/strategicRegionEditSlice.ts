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
  // Regions created this session that don't exist on disk yet (see
  // pendingNewStates).
  pendingNewStrategicRegions: Map<number, StrategicRegionDefinition>
  // IDs of on-disk regions marked for deletion (see pendingStateDeletions).
  pendingStrategicRegionDeletions: Set<number>
  editStrategicRegion: (id: number, patch: StrategicRegionEditPatch) => void
  // Adds provinceIds to targetRegionId and removes them from whichever other
  // region effectively holds them — a province can only belong to one
  // strategic region at a time. targetRegionId of null unassigns the
  // provinces without assigning them anywhere else. Unknown province IDs are
  // ignored.
  moveProvincesToRegion: (provinceIds: number[], targetRegionId: number | null) => void
  // Creates an empty region with the next-available ID and returns it (see
  // createState).
  createStrategicRegion: () => number
  // Marks a region for deletion, or drops it outright if pending-new (see
  // deleteState).
  deleteStrategicRegion: (id: number) => void
  // Undoes whatever pending change touches this id (see revertStateEdit).
  revertStrategicRegionEdit: (id: number) => void
  clearStrategicRegionSavedChanges: () => void
  clearStrategicRegionPendingChanges: () => void
}

export const STRATEGIC_REGION_EDIT_EMPTY = {
  pendingStrategicRegionEdits: new Map<number, StrategicRegionEditPatch>(),
  strategicRegionEditBaselines: new Map<number, StrategicRegionDefinition>(),
  pendingNewStrategicRegions: new Map<number, StrategicRegionDefinition>(),
  pendingStrategicRegionDeletions: new Set<number>(),
}

function nextStrategicRegionId(state: Pick<StrategicRegionEditStore, 'strategicRegionsById' | 'pendingNewStrategicRegions'>): number {
  let max = 0
  for (const id of state.strategicRegionsById.keys()) if (id > max) max = id
  for (const id of state.pendingNewStrategicRegions.keys()) if (id > max) max = id
  return max + 1
}

function emptyStrategicRegionDefinition(id: number): StrategicRegionDefinition {
  return { id, name: 'New Strategic Region', displayName: 'New Strategic Region', provinceIds: [], weatherPeriods: [] }
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

      const otherRegionIds = new Set([...state.strategicRegionsById.keys(), ...state.pendingNewStrategicRegions.keys()])
      for (const otherId of otherRegionIds) {
        if (otherId === targetRegionId) continue
        const current = effectiveProvinceIds(otherId)
        const filtered = current.filter((id) => !idSet.has(id))
        if (filtered.length === current.length) continue
        patchRegion(state, pendingStrategicRegionEdits, strategicRegionEditBaselines, otherId, { provinceIds: filtered })
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

    createStrategicRegion: () => {
      let assignedId = 0
      set((state) => {
        assignedId = nextStrategicRegionId(state)
        const pendingNewStrategicRegions = new Map(state.pendingNewStrategicRegions)
        pendingNewStrategicRegions.set(assignedId, emptyStrategicRegionDefinition(assignedId))
        return { pendingNewStrategicRegions }
      })
      return assignedId
    },

    deleteStrategicRegion: (id) => set((state) => {
      if (state.pendingNewStrategicRegions.has(id)) {
        const pendingNewStrategicRegions = new Map(state.pendingNewStrategicRegions)
        pendingNewStrategicRegions.delete(id)
        const pendingStrategicRegionEdits = new Map(state.pendingStrategicRegionEdits)
        pendingStrategicRegionEdits.delete(id)
        return { pendingNewStrategicRegions, pendingStrategicRegionEdits }
      }
      const pendingStrategicRegionDeletions = new Set(state.pendingStrategicRegionDeletions)
      pendingStrategicRegionDeletions.add(id)
      const pendingStrategicRegionEdits = new Map(state.pendingStrategicRegionEdits)
      pendingStrategicRegionEdits.delete(id)
      return { pendingStrategicRegionDeletions, pendingStrategicRegionEdits }
    }),

    revertStrategicRegionEdit: (id) => set((state) => {
      if (state.pendingNewStrategicRegions.has(id)) {
        const pendingNewStrategicRegions = new Map(state.pendingNewStrategicRegions)
        pendingNewStrategicRegions.delete(id)
        const pendingStrategicRegionEdits = new Map(state.pendingStrategicRegionEdits)
        pendingStrategicRegionEdits.delete(id)
        return { pendingNewStrategicRegions, pendingStrategicRegionEdits }
      }
      const pendingStrategicRegionDeletions = new Set(state.pendingStrategicRegionDeletions)
      pendingStrategicRegionDeletions.delete(id)
      const pendingStrategicRegionEdits = new Map(state.pendingStrategicRegionEdits)
      pendingStrategicRegionEdits.delete(id)
      const strategicRegionEditBaselines = new Map(state.strategicRegionEditBaselines)
      strategicRegionEditBaselines.delete(id)
      return { pendingStrategicRegionEdits, strategicRegionEditBaselines, pendingStrategicRegionDeletions }
    }),

    clearStrategicRegionSavedChanges: () => set({
      pendingStrategicRegionEdits: new Map<number, StrategicRegionEditPatch>(),
      strategicRegionEditBaselines: new Map<number, StrategicRegionDefinition>(),
      pendingNewStrategicRegions: new Map<number, StrategicRegionDefinition>(),
      pendingStrategicRegionDeletions: new Set<number>(),
    }),

    clearStrategicRegionPendingChanges: () => set({
      pendingStrategicRegionEdits: new Map<number, StrategicRegionEditPatch>(),
      strategicRegionEditBaselines: new Map<number, StrategicRegionDefinition>(),
      pendingNewStrategicRegions: new Map<number, StrategicRegionDefinition>(),
      pendingStrategicRegionDeletions: new Set<number>(),
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
