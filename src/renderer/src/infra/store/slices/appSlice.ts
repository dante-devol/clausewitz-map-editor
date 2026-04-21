import { type StateCreator } from 'zustand'

export type Theme = 'dark' | 'light'
export type View = 'map' | 'provinces' | 'settings'

export interface AppSlice {
  theme: Theme
  activeView: View
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setActiveView: (view: View) => void
}

export const APP_EMPTY = {
  theme: 'dark' as Theme,
  activeView: 'map' as View,
}

export const createAppSlice: StateCreator<AppSlice, [], [], AppSlice> = (set, get) => ({
  ...APP_EMPTY,
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
  setActiveView: (activeView) => set({ activeView }),
})
