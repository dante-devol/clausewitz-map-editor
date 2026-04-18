import { create } from 'zustand'
import type { ResolvedPaths } from '../../../shared/pathTypes'

interface ResolvedPathsState {
  paths: ResolvedPaths | null
  setPaths: (paths: ResolvedPaths) => void
  clear: () => void
}

export const useResolvedPathsStore = create<ResolvedPathsState>((set) => ({
  paths: null,
  setPaths: (paths) => set({ paths }),
  clear: () => set({ paths: null })
}))
