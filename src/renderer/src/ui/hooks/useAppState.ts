import { useCoreStore } from '../../infra/store/coreStore'

export type { Theme, View } from '../../infra/store/slices/appSlice'

export function useAppState() {
  const theme = useCoreStore((s) => s.theme)
  const activeView = useCoreStore((s) => s.activeView)
  const setTheme = useCoreStore((s) => s.setTheme)
  const setActiveView = useCoreStore((s) => s.setActiveView)
  const toggleTheme = useCoreStore((s) => s.toggleTheme)
  return { theme, activeView, setTheme, setActiveView, toggleTheme }
}
