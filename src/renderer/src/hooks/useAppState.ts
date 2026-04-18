import { useAppStore, type Theme, type View } from '../store/appStore'

export function useAppState() {
  const theme = useAppStore((s) => s.theme)
  const activeView = useAppStore((s) => s.activeView)
  const setTheme = useAppStore((s) => s.setTheme)
  const setActiveView = useAppStore((s) => s.setActiveView)

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return { theme, activeView, setTheme, setActiveView, toggleTheme }
}

export type { Theme, View }
