import { type StateCreator } from 'zustand'
import type { Province } from '../../../../../shared/mapDataTypes'
import type {
  BmpOnlyEntry,
  BmpAssignmentAction,
  ProvinceDraftFields
} from '../../../../../shared/provinceEditing'

export interface ProvinceEditSlice {
  originalDefinitions: Map<number, Province>
  // Hash of the definition.csv content `originalDefinitions` came from; sent
  // with saves so the main process refuses to overwrite a changed file.
  definitionsHash: string | null
  bmpOnlyEntries: BmpOnlyEntry[]
  bmpOnlyByColor: Map<number, string>
  pendingEdits: Map<number, Partial<ProvinceDraftFields>>
  pendingBmpOnlyEdits: Map<string, ProvinceDraftFields>
  bmpReplacements: Map<number, string>
  pendingNewProvinces: Map<string, number>
  loadOriginalDefinitions: (provinces: Province[], hash: string) => void
  pruneBmpOnlyEntries: (definedColors: ReadonlySet<number>) => void
  syncBmpOnlyEntries: (colors: number[]) => void
  editProvince: (id: number, patch: Partial<ProvinceDraftFields>) => void
  editBmpOnlyProvince: (guid: string, patch: Partial<ProvinceDraftFields>) => void
  revertEdit: (id: number) => void
  revertBmpOnlyEdit: (guid: string) => void
  assignBmpProvince: (guid: string, action: BmpAssignmentAction) => void
  revertBmpReplacement: (provinceId: number) => void
  revertNewProvince: (guid: string) => void
  removeBmpOnlyEntry: (color: number) => void
  clearSavedChanges: () => void
  clearPendingChanges: () => void
}

export const PROVINCE_EDIT_EMPTY = {
  originalDefinitions: new Map<number, Province>(),
  definitionsHash: null as string | null,
  bmpOnlyEntries: [] as BmpOnlyEntry[],
  bmpOnlyByColor: new Map<number, string>(),
  pendingEdits: new Map<number, Partial<ProvinceDraftFields>>(),
  pendingBmpOnlyEdits: new Map<string, ProvinceDraftFields>(),
  bmpReplacements: new Map<number, string>(),
  pendingNewProvinces: new Map<string, number>(),
}

function shortGuid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8)
}

function createEmptyDraftFields(): ProvinceDraftFields {
  return { type: undefined, isCoastal: undefined, terrain: undefined, continent: undefined }
}

export const createProvinceEditSlice: StateCreator<ProvinceEditSlice, [], [], ProvinceEditSlice> = (set) => ({
  ...PROVINCE_EDIT_EMPTY,

  loadOriginalDefinitions: (incoming, definitionsHash) => {
    const originalDefinitions = new Map<number, Province>()
    for (const p of incoming) originalDefinitions.set(p.id, p)
    set({ originalDefinitions, definitionsHash })
  },

  // Drops BMP-only entries whose colour now has a definition (e.g. after new
  // provinces were saved), so they don't reappear as unregistered duplicates.
  pruneBmpOnlyEntries: (definedColors) => set((state) => {
    const removed = state.bmpOnlyEntries.filter((entry) => definedColors.has(entry.color))
    if (removed.length === 0) return {}
    const removedGuids = new Set(removed.map((entry) => entry.guid))
    const bmpOnlyByColor = new Map(state.bmpOnlyByColor)
    for (const entry of removed) bmpOnlyByColor.delete(entry.color)
    const pendingBmpOnlyEdits = new Map(state.pendingBmpOnlyEdits)
    for (const guid of removedGuids) pendingBmpOnlyEdits.delete(guid)
    return {
      bmpOnlyEntries: state.bmpOnlyEntries.filter((entry) => !removedGuids.has(entry.guid)),
      bmpOnlyByColor,
      pendingBmpOnlyEdits
    }
  }),

  syncBmpOnlyEntries: (colors) => set((state) => {
    const bmpOnlyByColor = new Map(state.bmpOnlyByColor)
    const bmpOnlyEntries = [...state.bmpOnlyEntries]
    for (const color of colors) {
      if (!bmpOnlyByColor.has(color)) {
        const guid = shortGuid()
        bmpOnlyByColor.set(color, guid)
        bmpOnlyEntries.push({ guid, color })
      }
    }
    return { bmpOnlyByColor, bmpOnlyEntries }
  }),

  editProvince: (id, patch) => set((state) => {
    const pendingEdits = new Map(state.pendingEdits)
    const existing = pendingEdits.get(id) ?? {}
    pendingEdits.set(id, { ...existing, ...patch })
    return { pendingEdits }
  }),

  editBmpOnlyProvince: (guid, patch) => set((state) => {
    const pendingBmpOnlyEdits = new Map(state.pendingBmpOnlyEdits)
    const existing = pendingBmpOnlyEdits.get(guid) ?? createEmptyDraftFields()
    pendingBmpOnlyEdits.set(guid, { ...existing, ...patch })
    return { pendingBmpOnlyEdits }
  }),

  revertEdit: (id) => set((state) => {
    const pendingEdits = new Map(state.pendingEdits)
    pendingEdits.delete(id)
    return { pendingEdits }
  }),

  revertBmpOnlyEdit: (guid) => set((state) => {
    const pendingBmpOnlyEdits = new Map(state.pendingBmpOnlyEdits)
    pendingBmpOnlyEdits.delete(guid)
    return { pendingBmpOnlyEdits }
  }),

  assignBmpProvince: (guid, action) => set((state) => {
    const bmpReplacements = new Map(state.bmpReplacements)
    const pendingNewProvinces = new Map(state.pendingNewProvinces)
    const pendingBmpOnlyEdits = new Map(state.pendingBmpOnlyEdits)
    const pendingEdits = new Map(state.pendingEdits)
    const draft = pendingBmpOnlyEdits.get(guid) ?? createEmptyDraftFields()

    for (const [id, g] of bmpReplacements) {
      if (g === guid) { bmpReplacements.delete(id); break }
    }
    pendingNewProvinces.delete(guid)

    if (action.type === 'replace') {
      bmpReplacements.set(action.targetId, guid)
      const existing = pendingEdits.get(action.targetId) ?? {}
      pendingEdits.set(action.targetId, { ...existing, ...draft })
    } else {
      pendingNewProvinces.set(guid, action.assignedId)
      const existing = pendingEdits.get(action.assignedId) ?? {}
      pendingEdits.set(action.assignedId, { ...existing, ...draft })
    }

    pendingBmpOnlyEdits.delete(guid)
    return { bmpReplacements, pendingNewProvinces, pendingBmpOnlyEdits, pendingEdits }
  }),

  revertBmpReplacement: (provinceId) => set((state) => {
    const bmpReplacements = new Map(state.bmpReplacements)
    bmpReplacements.delete(provinceId)
    return { bmpReplacements }
  }),

  removeBmpOnlyEntry: (color) => set((state) => {
    const bmpOnlyByColor = new Map(state.bmpOnlyByColor)
    const guid = bmpOnlyByColor.get(color)
    if (!guid) return {}
    bmpOnlyByColor.delete(color)
    const bmpOnlyEntries = state.bmpOnlyEntries.filter((e) => e.color !== color)
    const pendingBmpOnlyEdits = new Map(state.pendingBmpOnlyEdits)
    pendingBmpOnlyEdits.delete(guid)
    return { bmpOnlyByColor, bmpOnlyEntries, pendingBmpOnlyEdits }
  }),

  revertNewProvince: (guid) => set((state) => {
    const pendingNewProvinces = new Map(state.pendingNewProvinces)
    const pendingEdits = new Map(state.pendingEdits)
    const assignedId = pendingNewProvinces.get(guid)
    if (assignedId !== undefined) pendingEdits.delete(assignedId)
    pendingNewProvinces.delete(guid)
    return { pendingNewProvinces, pendingEdits }
  }),

  clearPendingChanges: () => set({
    pendingEdits: new Map<number, Partial<ProvinceDraftFields>>(),
    pendingBmpOnlyEdits: new Map<string, ProvinceDraftFields>(),
    bmpReplacements: new Map<number, string>(),
    pendingNewProvinces: new Map<string, number>(),
  }),

  clearSavedChanges: () => set({
    pendingEdits: new Map<number, Partial<ProvinceDraftFields>>(),
    bmpReplacements: new Map<number, string>(),
    pendingNewProvinces: new Map<string, number>(),
  }),
})
