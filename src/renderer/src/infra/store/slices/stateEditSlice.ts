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
  revertStateEdit: (id: number) => void
  clearStateSavedChanges: () => void
  clearStatePendingChanges: () => void
}

export const STATE_EDIT_EMPTY = {
  pendingStateEdits: new Map<number, StateEditPatch>(),
  stateEditBaselines: new Map<number, StateDefinition>(),
}

type StateEditStore = StateEditSlice & Pick<DatasetSlice, 'statesById'>

export const createStateEditSlice: StateCreator<StateEditStore, [], [], StateEditSlice> = (set) => ({
  ...STATE_EDIT_EMPTY,

  editState: (id, patch) => set((state) => {
    const pendingStateEdits = new Map(state.pendingStateEdits)
    const existing = pendingStateEdits.get(id) ?? {}
    pendingStateEdits.set(id, { ...existing, ...patch })

    let stateEditBaselines = state.stateEditBaselines
    const current = state.statesById.get(id)
    if (!stateEditBaselines.has(id) && current) {
      stateEditBaselines = new Map(stateEditBaselines)
      stateEditBaselines.set(id, current)
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
})

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
