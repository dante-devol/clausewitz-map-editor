import { type StateCreator } from 'zustand'
import type {
  DateHistory,
  GenericEffect,
  StateDefinition,
  StateResource,
  StateBuildingDefinition,
  ProvinceBuildingDefinition,
  VictoryPoint
} from '../../../../../shared/mapDataTypes'
import type { DatasetSlice } from './datasetSlice'
import type { ProvinceEditSlice } from './provinceEditSlice'

export interface StateEditPatch {
  // Required fields
  name?: string
  stateCategory?: string
  manpower?: number
  // Optional state-level fields — null = explicitly removed
  isImpassable?: boolean | null
  localSupplies?: number | null
  buildingsMaxLevelFactor?: number | null
  // Optional list fields — full replacement (empty array = remove all)
  resources?: StateResource[]
  provinceIds?: number[]
  // Base history fields
  owner?: string | null       // null = explicitly removed
  coreOf?: string[]
  victoryPoints?: VictoryPoint[]
  buildings?: (StateBuildingDefinition | ProvinceBuildingDefinition)[]
  historyEffects?: GenericEffect[]
  // Date history — full replacement
  dateHistory?: DateHistory[]
}

export interface StateEditSlice {
  pendingStateEdits: Map<number, StateEditPatch>
  // Each edited state as it was when its first edit was made. Saves send it as
  // the `original` so the main process can detect fields that changed on disk
  // in the meantime instead of silently overwriting them.
  stateEditBaselines: Map<number, StateDefinition>
  editState: (id: number, patch: StateEditPatch) => void
  // Adds provinceIds to targetStateId and removes them from whichever other
  // state effectively holds them (its loaded provinceIds, or a pending edit's
  // if it has one) — a province can only belong to one state at a time.
  // Unknown province IDs are ignored.
  moveProvincesToState: (provinceIds: number[], targetStateId: number) => void
  revertStateEdit: (id: number) => void
  clearStateSavedChanges: () => void
  clearStatePendingChanges: () => void
}

export const STATE_EDIT_EMPTY = {
  pendingStateEdits: new Map<number, StateEditPatch>(),
  stateEditBaselines: new Map<number, StateDefinition>(),
}

type StateEditStore = StateEditSlice
  & Pick<DatasetSlice, 'statesById'>
  & Pick<ProvinceEditSlice, 'originalDefinitions' | 'pendingNewProvinces'>

export const createStateEditSlice: StateCreator<StateEditStore, [], [], StateEditSlice> = (set) => {
  // Shared by editState and moveProvincesToState: applies `patch` on top of
  // `pendingStateEdits`/`stateEditBaselines`, capturing a baseline the first
  // time a state is touched.
  function patchState(
    state: StateEditStore,
    pendingStateEdits: Map<number, StateEditPatch>,
    stateEditBaselines: Map<number, StateDefinition>,
    id: number,
    patch: StateEditPatch
  ): void {
    const existing = pendingStateEdits.get(id) ?? {}
    pendingStateEdits.set(id, { ...existing, ...patch })
    if (!stateEditBaselines.has(id)) {
      const current = state.statesById.get(id)
      if (current) stateEditBaselines.set(id, current)
    }
  }

  return {
    ...STATE_EDIT_EMPTY,

    editState: (id, patch) => set((state) => {
      const pendingStateEdits = new Map(state.pendingStateEdits)
      const stateEditBaselines = new Map(state.stateEditBaselines)
      patchState(state, pendingStateEdits, stateEditBaselines, id, patch)
      return { pendingStateEdits, stateEditBaselines }
    }),

    moveProvincesToState: (provinceIds, targetStateId) => set((state) => {
      const validIds = provinceIds.filter((id) =>
        state.originalDefinitions.has(id) || [...state.pendingNewProvinces.values()].includes(id)
      )
      if (validIds.length === 0) return {}
      const idSet = new Set(validIds)

      const pendingStateEdits = new Map(state.pendingStateEdits)
      const stateEditBaselines = new Map(state.stateEditBaselines)

      const effectiveProvinceIds = (stateId: number): number[] =>
        pendingStateEdits.get(stateId)?.provinceIds ?? state.statesById.get(stateId)?.provinceIds ?? []

      for (const other of state.statesById.values()) {
        if (other.id === targetStateId) continue
        const current = effectiveProvinceIds(other.id)
        const filtered = current.filter((id) => !idSet.has(id))
        if (filtered.length === current.length) continue
        patchState(state, pendingStateEdits, stateEditBaselines, other.id, { provinceIds: filtered })
      }

      const targetCurrent = effectiveProvinceIds(targetStateId)
      const targetSet = new Set(targetCurrent)
      const additions = validIds.filter((id) => !targetSet.has(id))
      if (additions.length > 0) {
        patchState(state, pendingStateEdits, stateEditBaselines, targetStateId, {
          provinceIds: [...targetCurrent, ...additions]
        })
      }

      return { pendingStateEdits, stateEditBaselines }
    }),

    revertStateEdit: (id) => set((state) => {
      const pendingStateEdits = new Map(state.pendingStateEdits)
      pendingStateEdits.delete(id)
      const stateEditBaselines = new Map(state.stateEditBaselines)
      stateEditBaselines.delete(id)
      return { pendingStateEdits, stateEditBaselines }
    }),

    clearStateSavedChanges: () => set({
      pendingStateEdits: new Map<number, StateEditPatch>(),
      stateEditBaselines: new Map<number, StateDefinition>(),
    }),

    clearStatePendingChanges: () => set({
      pendingStateEdits: new Map<number, StateEditPatch>(),
      stateEditBaselines: new Map<number, StateDefinition>(),
    }),
  }
}

export function applyStatePatch(original: StateDefinition, patch: StateEditPatch): StateDefinition {
  const result: StateDefinition = {
    ...original,
    name: patch.name ?? original.name,
    stateCategory: patch.stateCategory ?? original.stateCategory,
    manpower: patch.manpower ?? original.manpower,
    provinceIds: patch.provinceIds ?? original.provinceIds,
    history: { ...original.history },
  }

  if ('isImpassable' in patch) result.isImpassable = patch.isImpassable ?? undefined
  else result.isImpassable = original.isImpassable

  if ('localSupplies' in patch) result.localSupplies = patch.localSupplies ?? undefined
  else result.localSupplies = original.localSupplies

  if ('buildingsMaxLevelFactor' in patch) result.buildingsMaxLevelFactor = patch.buildingsMaxLevelFactor ?? undefined
  else result.buildingsMaxLevelFactor = original.buildingsMaxLevelFactor

  result.resources = patch.resources !== undefined
    ? (patch.resources.length > 0 ? patch.resources : undefined)
    : original.resources

  if ('owner' in patch) result.history.owner = patch.owner ?? undefined
  if (patch.coreOf !== undefined) result.history.coreOf = patch.coreOf
  if (patch.victoryPoints !== undefined) result.history.victoryPoints = patch.victoryPoints
  if (patch.buildings !== undefined) result.history.buildings = patch.buildings
  if (patch.historyEffects !== undefined) result.history.effects = patch.historyEffects
  if (patch.dateHistory !== undefined) result.history.dateHistory = patch.dateHistory

  return result
}
