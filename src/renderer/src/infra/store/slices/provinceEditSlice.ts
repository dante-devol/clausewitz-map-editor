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
  // The province's pendingEdits patch from right before it first became a
  // bmp-replacement target, keyed by provinceId — assignBmpProvince merges
  // the bmp-only entry's draft fields into pendingEdits, and this is what
  // revertBmpReplacement restores instead of leaving that merge in place.
  // A key present with value undefined means there was no prior patch to
  // restore (revert should delete the pendingEdits entry, not merely clear
  // it); a missing key means there's nothing recorded to revert.
  bmpReplacementOriginalEdits: Map<number, Partial<ProvinceDraftFields> | undefined>
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
  bmpReplacementOriginalEdits: new Map<number, Partial<ProvinceDraftFields> | undefined>(),
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
    const bmpReplacementOriginalEdits = new Map(state.bmpReplacementOriginalEdits)
    const pendingNewProvinces = new Map(state.pendingNewProvinces)
    const pendingBmpOnlyEdits = new Map(state.pendingBmpOnlyEdits)
    const pendingEdits = new Map(state.pendingEdits)
    const draft = pendingBmpOnlyEdits.get(guid) ?? createEmptyDraftFields()

    for (const [id, g] of bmpReplacements) {
      if (g === guid) { bmpReplacements.delete(id); break }
    }
    pendingNewProvinces.delete(guid)

    if (action.type === 'replace') {
      // Only record a backup the first time this province becomes a
      // replacement target. If it's already one (the target is being
      // reassigned to a different bmp-only color without reverting first),
      // the existing backup already predates all replacement activity on
      // this province and must be kept as-is.
      if (!bmpReplacementOriginalEdits.has(action.targetId)) {
        bmpReplacementOriginalEdits.set(action.targetId, state.pendingEdits.get(action.targetId))
      }
      bmpReplacements.set(action.targetId, guid)
      const existing = pendingEdits.get(action.targetId) ?? {}
      pendingEdits.set(action.targetId, { ...existing, ...draft })
    } else {
      // Callers should derive assignedId from selectNextAvailableProvinceId,
      // but a stale caller (e.g. a batch computed before an earlier revert)
      // could still hand out an ID that's since been taken — refuse rather
      // than silently making two provinces share an ID.
      const taken = state.originalDefinitions.has(action.assignedId)
        || [...pendingNewProvinces.values()].includes(action.assignedId)
      if (taken) {
        throw new Error(`Province ID ${action.assignedId} is already in use.`)
      }
      pendingNewProvinces.set(guid, action.assignedId)
      const existing = pendingEdits.get(action.assignedId) ?? {}
      pendingEdits.set(action.assignedId, { ...existing, ...draft })
    }

    pendingBmpOnlyEdits.delete(guid)
    return { bmpReplacements, bmpReplacementOriginalEdits, pendingNewProvinces, pendingBmpOnlyEdits, pendingEdits }
  }),

  revertBmpReplacement: (provinceId) => set((state) => {
    if (!state.bmpReplacements.has(provinceId)) return {}
    const bmpReplacements = new Map(state.bmpReplacements)
    bmpReplacements.delete(provinceId)

    const bmpReplacementOriginalEdits = new Map(state.bmpReplacementOriginalEdits)
    const pendingEdits = new Map(state.pendingEdits)
    if (bmpReplacementOriginalEdits.has(provinceId)) {
      const priorPatch = bmpReplacementOriginalEdits.get(provinceId)
      if (priorPatch === undefined) pendingEdits.delete(provinceId)
      else pendingEdits.set(provinceId, priorPatch)
      bmpReplacementOriginalEdits.delete(provinceId)
    }

    return { bmpReplacements, bmpReplacementOriginalEdits, pendingEdits }
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
    bmpReplacementOriginalEdits: new Map<number, Partial<ProvinceDraftFields> | undefined>(),
    pendingNewProvinces: new Map<string, number>(),
  }),

  clearSavedChanges: () => set({
    pendingEdits: new Map<number, Partial<ProvinceDraftFields>>(),
    bmpReplacements: new Map<number, string>(),
    bmpReplacementOriginalEdits: new Map<number, Partial<ProvinceDraftFields> | undefined>(),
    pendingNewProvinces: new Map<string, number>(),
  }),
})
