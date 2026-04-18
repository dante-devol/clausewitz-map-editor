import { useCoreApi } from '../bridge/CoreProvider'
import { useCoreSelector } from '../bridge/useCoreSelector'
import { appCommands } from '../core/commands/appCommands'
import { selectActiveView, selectTheme } from '../core/selectors/appSelectors'
import type { Theme, View } from '../core/contracts/CoreState'

export function useAppState() {
  const api = useCoreApi()
  const theme = useCoreSelector(selectTheme)
  const activeView = useCoreSelector(selectActiveView)

  function setTheme(nextTheme: Theme) {
    api.dispatch(appCommands.setTheme(nextTheme))
  }

  function setActiveView(view: View) {
    api.dispatch(appCommands.setActiveView(view))
  }

  function toggleTheme() {
    api.dispatch(appCommands.toggleTheme())
  }

  return { theme, activeView, setTheme, setActiveView, toggleTheme }
}

export type { Theme, View }
