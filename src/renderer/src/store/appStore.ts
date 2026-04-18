import { create } from 'zustand'

export type Theme = 'dark' | 'light'
export type View = 'map' | 'provinces' | 'settings'

interface AppState {
  theme: Theme
  activeView: View
  setTheme: (theme: Theme) => void
  setActiveView: (view: View) => void
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  activeView: 'map',
  setTheme: (theme) => set({ theme }),
  setActiveView: (view) => set({ activeView: view })
}))
