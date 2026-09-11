import { type StateCreator } from 'zustand'

export interface ImageSlice {
  provincesImage: Uint8Array | null
  provincesImageHash: string | null
  provinceBitmapStatus: 'idle' | 'loading' | 'ready' | 'error'
  loadProvincesImage: (data: Uint8Array, hash: string) => void
  setProvinceBitmapStatus: (status: 'idle' | 'loading' | 'ready' | 'error') => void
}

export const IMAGE_EMPTY = {
  provincesImage: null as Uint8Array | null,
  provincesImageHash: null as string | null,
  provinceBitmapStatus: 'idle' as const,
}

export const createImageSlice: StateCreator<ImageSlice, [], [], ImageSlice> = (set) => ({
  ...IMAGE_EMPTY,

  loadProvincesImage: (data, hash) => set({ provincesImage: data, provincesImageHash: hash }),

  setProvinceBitmapStatus: (provinceBitmapStatus) => set({ provinceBitmapStatus }),
})
