import { type StateCreator } from 'zustand'
import type { BmpPixelStroke, BmpPixelStrokeDelta } from '../../../../../shared/provinceEditing'

export interface BmpEditSlice {
  pendingBmpStrokes: BmpPixelStroke[]
  pendingRevertPixels: BmpPixelStrokeDelta[] | null
  paintProvinceColor: number | null
  brushRadius: number
  paintSelection: Set<number>
  addBmpStroke: (stroke: BmpPixelStroke) => void
  revertBmpStroke: (strokeId: string) => void
  consumePendingRevert: () => void
  clearBmpStrokes: () => void
  setPaintProvinceColor: (color: number | null) => void
  setBrushRadius: (radius: number) => void
  togglePaintSelectionColor: (packedColor: number) => void
  clearPaintSelection: () => void
}

export const BMP_EDIT_EMPTY = {
  pendingBmpStrokes: [] as BmpPixelStroke[],
  pendingRevertPixels: null as BmpPixelStrokeDelta[] | null,
  paintProvinceColor: null as number | null,
  brushRadius: 5,
  paintSelection: new Set<number>(),
}

export const createBmpEditSlice: StateCreator<BmpEditSlice, [], [], BmpEditSlice> = (set) => ({
  ...BMP_EDIT_EMPTY,

  addBmpStroke: (stroke) => set((state) => ({
    pendingBmpStrokes: [...state.pendingBmpStrokes, stroke]
  })),

  revertBmpStroke: (strokeId) => set((state) => {
    const stroke = state.pendingBmpStrokes.find((s) => s.id === strokeId)
    return {
      pendingBmpStrokes: state.pendingBmpStrokes.filter((s) => s.id !== strokeId),
      pendingRevertPixels: stroke ? stroke.pixels : null,
    }
  }),

  consumePendingRevert: () => set({ pendingRevertPixels: null }),

  clearBmpStrokes: () => set({ pendingBmpStrokes: [] }),

  setPaintProvinceColor: (color) => set({ paintProvinceColor: color }),

  setBrushRadius: (radius) => set({ brushRadius: Math.max(1, Math.min(30, radius)) }),

  togglePaintSelectionColor: (packedColor) => set((state) => {
    const next = new Set(state.paintSelection)
    if (next.has(packedColor)) next.delete(packedColor)
    else next.add(packedColor)
    return { paintSelection: next }
  }),

  clearPaintSelection: () => set({ paintSelection: new Set() }),
})
