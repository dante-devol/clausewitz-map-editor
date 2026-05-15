import { type StateCreator } from 'zustand'

export type EditorMode = 'provinces' | 'states' | 'strategicRegions' | 'paint'

export interface EditorModeSlice {
  editorMode: EditorMode
  setEditorMode: (mode: EditorMode) => void
}

export const EDITOR_MODE_EMPTY = {
  editorMode: 'provinces' as EditorMode,
}

export const createEditorModeSlice: StateCreator<EditorModeSlice, [], [], EditorModeSlice> = (set) => ({
  ...EDITOR_MODE_EMPTY,
  setEditorMode: (mode) => set({ editorMode: mode }),
})
