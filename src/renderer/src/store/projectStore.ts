import { create } from 'zustand'
import type { GameVerificationResult, ModVerificationResult } from '../../../shared/pathTypes'

interface ProjectState {
  recentProjects: string[]
  gamePath: string | null
  gameVerification: GameVerificationResult | null
  // Set when a mod has no recognized paths — holds path + verification so the UI can warn and confirm.
  pendingProject: { path: string; verification: ModVerificationResult } | null
  setRecentProjects: (projects: string[]) => void
  setGamePath: (path: string | null) => void
  setGameVerification: (result: GameVerificationResult | null) => void
  setPendingProject: (pending: { path: string; verification: ModVerificationResult } | null) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  recentProjects: [],
  gamePath: null,
  gameVerification: null,
  pendingProject: null,
  setRecentProjects: (projects) => set({ recentProjects: projects }),
  setGamePath: (path) => set({ gamePath: path }),
  setGameVerification: (result) => set({ gameVerification: result }),
  setPendingProject: (pending) => set({ pendingProject: pending })
}))
