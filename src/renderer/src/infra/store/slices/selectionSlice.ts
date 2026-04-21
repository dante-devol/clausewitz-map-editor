import { type StateCreator } from 'zustand'

export interface SelectionSlice {
  selectedProvinceIds: number[]
  selectedBmpGuids: string[]
  setSelection: (ids: number[]) => void
  extendSelection: (ids: number[]) => void
  toggleProvinceId: (id: number) => void
  setSelectedBmpGuids: (guids: string[]) => void
  toggleBmpGuid: (guid: string) => void
  clearAllSelection: () => void
}

export const SELECTION_EMPTY = {
  selectedProvinceIds: [] as number[],
  selectedBmpGuids: [] as string[],
}

export const createSelectionSlice: StateCreator<SelectionSlice, [], [], SelectionSlice> = (set) => ({
  ...SELECTION_EMPTY,

  setSelection: (ids) => set({ selectedProvinceIds: ids, selectedBmpGuids: [] }),

  extendSelection: (ids) => set((state) => {
    const existing = new Set(state.selectedProvinceIds)
    for (const id of ids) existing.add(id)
    return { selectedProvinceIds: [...existing] }
  }),

  toggleProvinceId: (id) => set((state) => {
    const exists = state.selectedProvinceIds.includes(id)
    return {
      selectedProvinceIds: exists
        ? state.selectedProvinceIds.filter((x) => x !== id)
        : [...state.selectedProvinceIds, id]
    }
  }),

  setSelectedBmpGuids: (guids) => set({ selectedBmpGuids: guids, selectedProvinceIds: [] }),

  toggleBmpGuid: (guid) => set((state) => {
    const exists = state.selectedBmpGuids.includes(guid)
    return {
      selectedBmpGuids: exists
        ? state.selectedBmpGuids.filter((g) => g !== guid)
        : [...state.selectedBmpGuids, guid]
    }
  }),

  clearAllSelection: () => set({ selectedProvinceIds: [], selectedBmpGuids: [] }),
})
