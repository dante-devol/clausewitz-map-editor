import { type StateCreator } from 'zustand'

export interface LocalisationSlice {
  // Loc key -> resolved display string. Arrives incrementally and in the
  // background (see main's ProjectSession/resolveLocalisationKeys) — a key
  // with no entry here yet just isn't resolved, not necessarily missing.
  localisationEntries: Record<string, string>
  mergeLocalisation: (entries: Record<string, string>) => void
}

export const LOCALISATION_EMPTY = {
  localisationEntries: {} as Record<string, string>,
}

export const createLocalisationSlice: StateCreator<LocalisationSlice, [], [], LocalisationSlice> = (set) => ({
  ...LOCALISATION_EMPTY,

  mergeLocalisation: (entries) => set((state) => ({
    localisationEntries: { ...state.localisationEntries, ...entries }
  })),
})
