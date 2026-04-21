import { type StateCreator } from 'zustand'

export interface ImageSlice {
  provincesImageB64: string | null
  provinceBitmapStatus: 'idle' | 'loading' | 'ready' | 'error'
  loadProvincesImage: (b64: string) => void
  setProvinceBitmapStatus: (status: 'idle' | 'loading' | 'ready' | 'error') => void
}

export const IMAGE_EMPTY = {
  provincesImageB64: null as string | null,
  provinceBitmapStatus: 'idle' as const,
}

export const createImageSlice: StateCreator<ImageSlice, [], [], ImageSlice> = (set) => ({
  ...IMAGE_EMPTY,

  loadProvincesImage: (b64) => set({ provincesImageB64: b64 }),

  setProvinceBitmapStatus: (provinceBitmapStatus) => set({ provinceBitmapStatus }),
})
