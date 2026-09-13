import { create } from 'zustand'

const MIN_RING_DEPTH = 0
const MAX_RING_DEPTH = 5

export function clampRingDepth(value: number): number {
  return Math.max(MIN_RING_DEPTH, Math.min(MAX_RING_DEPTH, Math.round(value)))
}

interface NeighborRevealConfigState {
  ringDepth: number
  isLoaded: boolean
  load: (ringDepth: number) => void
  setRingDepth: (next: number) => Promise<void>
}

export const useNeighborRevealConfigStore = create<NeighborRevealConfigState>((set) => ({
  ringDepth: 1,
  isLoaded: false,

  load: (ringDepth) => set({ ringDepth: clampRingDepth(ringDepth), isLoaded: true }),

  setRingDepth: async (next) => {
    const clamped = clampRingDepth(next)
    set({ ringDepth: clamped })
    await window.api.settings.set('neighborRevealRingDepth', clamped)
  }
}))
