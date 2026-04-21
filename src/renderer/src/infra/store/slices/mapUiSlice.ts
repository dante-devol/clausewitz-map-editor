import { type StateCreator } from 'zustand'
import { INITIAL_MAP_OVERLAYS, type MapOverlayState, type OverlayId, type OverlayFilterRule } from '../../../core/contracts/MapOverlay'
import type { DisplayMode } from '../../config/displayModes'

export interface MapUiSlice {
  displayMode: DisplayMode
  overlays: MapOverlayState[]
  setDisplayMode: (mode: DisplayMode) => void
  setOverlayVisibility: (overlayId: OverlayId, visible: boolean) => void
  setOverlayOpacity: (overlayId: OverlayId, opacity: number) => void
  setOverlayFilterRules: (overlayId: OverlayId, rules: OverlayFilterRule[]) => void
  setOverlayLineColor: (overlayId: OverlayId, lineColor: string) => void
  moveOverlay: (overlayId: OverlayId, targetOverlayId: OverlayId) => void
}

export const MAP_UI_EMPTY = {
  displayMode: 'provinces' as DisplayMode,
  overlays: INITIAL_MAP_OVERLAYS,
}

export const createMapUiSlice: StateCreator<MapUiSlice, [], [], MapUiSlice> = (set) => ({
  ...MAP_UI_EMPTY,

  setDisplayMode: (displayMode) => set({ displayMode }),

  setOverlayVisibility: (overlayId, visible) => set((s) => ({
    overlays: s.overlays.map((o) => o.id === overlayId ? { ...o, visible } : o),
  })),

  setOverlayOpacity: (overlayId, opacity) => set((s) => ({
    overlays: s.overlays.map((o) =>
      o.id === overlayId ? { ...o, opacity: Math.max(0, Math.min(100, opacity)) } : o
    ),
  })),

  setOverlayFilterRules: (overlayId, rules) => set((s) => ({
    overlays: s.overlays.map((o) =>
      o.id === overlayId && o.kind === 'bitmap' ? { ...o, filterRules: rules } : o
    ),
  })),

  setOverlayLineColor: (overlayId, lineColor) => set((s) => ({
    overlays: s.overlays.map((o) =>
      o.id === overlayId && o.kind === 'outline' ? { ...o, lineColor } : o
    ),
  })),

  moveOverlay: (overlayId, targetOverlayId) => set((s) => {
    const fromIndex = s.overlays.findIndex((o) => o.id === overlayId)
    const toIndex = s.overlays.findIndex((o) => o.id === targetOverlayId)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return s
    const overlays = [...s.overlays]
    const [moved] = overlays.splice(fromIndex, 1)
    overlays.splice(toIndex, 0, moved)
    return { overlays }
  }),
})
