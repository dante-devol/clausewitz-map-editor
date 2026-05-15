import { type StateCreator } from 'zustand'

export interface SelectionSlice {
  selectedProvinceIds: number[]
  selectedBmpGuids: string[]
  selectedStateId: number | null
  selectedStrategicRegionId: number | null
  setSelection: (ids: number[]) => void
  extendSelection: (ids: number[]) => void
  toggleProvinceId: (id: number) => void
  setSelectedBmpGuids: (guids: string[]) => void
  toggleBmpGuid: (guid: string) => void
  setSelectedStateId: (id: number | null) => void
  setSelectedStrategicRegionId: (id: number | null) => void
  clearAllSelection: () => void
}

export const SELECTION_EMPTY = {
  selectedProvinceIds: [] as number[],
  selectedBmpGuids: [] as string[],
  selectedStateId: null as number | null,
  selectedStrategicRegionId: null as number | null,
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

  setSelectedStateId: (id) => set({ selectedStateId: id }),

  setSelectedStrategicRegionId: (id) => set({ selectedStrategicRegionId: id }),

  clearAllSelection: () => set({ selectedProvinceIds: [], selectedBmpGuids: [], selectedStateId: null, selectedStrategicRegionId: null }),
})
