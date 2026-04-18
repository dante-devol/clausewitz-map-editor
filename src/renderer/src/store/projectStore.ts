import { create } from 'zustand'

interface ProjectState {
  currentProject: string | null
  recentProjects: string[]
  setCurrentProject: (path: string | null) => void
  setRecentProjects: (projects: string[]) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  recentProjects: [],
  setCurrentProject: (path) => set({ currentProject: path }),
  setRecentProjects: (projects) => set({ recentProjects: projects })
}))
