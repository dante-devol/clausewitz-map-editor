import { type StateCreator } from 'zustand'
import type {
  StateResource,
  StateBuildingDefinition,
  ProvinceBuildingDefinition
} from '../../../../../shared/mapDataTypes'

export interface StateEditPatch {
  name?: string
  stateCategory?: string
  manpower?: number
  owner?: string | null
  coreOf?: string[]
  resources?: StateResource[]
  buildings?: (StateBuildingDefinition | ProvinceBuildingDefinition)[]
}

export interface StateEditSlice {
  pendingStateEdits: Map<number, StateEditPatch>
  editState: (id: number, patch: StateEditPatch) => void
  revertStateEdit: (id: number) => void
  clearStateSavedChanges: () => void
  clearStatePendingChanges: () => void
}

export const STATE_EDIT_EMPTY = {
  pendingStateEdits: new Map<number, StateEditPatch>(),
}

export const createStateEditSlice: StateCreator<StateEditSlice, [], [], StateEditSlice> = (set) => ({
  ...STATE_EDIT_EMPTY,

  editState: (id, patch) => set((state) => {
    const pendingStateEdits = new Map(state.pendingStateEdits)
    const existing = pendingStateEdits.get(id) ?? {}
    pendingStateEdits.set(id, { ...existing, ...patch })
    return { pendingStateEdits }
  }),

  revertStateEdit: (id) => set((state) => {
    const pendingStateEdits = new Map(state.pendingStateEdits)
    pendingStateEdits.delete(id)
    return { pendingStateEdits }
  }),

  clearStateSavedChanges: () => set({
    pendingStateEdits: new Map<number, StateEditPatch>(),
  }),

  clearStatePendingChanges: () => set({
    pendingStateEdits: new Map<number, StateEditPatch>(),
  }),
})
