import type { CoreCommand } from '../contracts/CoreCommand'
import type { CoreState } from '../contracts/CoreState'

export function handleAppCommand(state: CoreState, command: CoreCommand): CoreState | null {
  switch (command.type) {
    case 'app/setTheme':
      return {
        ...state,
        app: {
          ...state.app,
          theme: command.theme
        }
      }

    case 'app/toggleTheme':
      return {
        ...state,
        app: {
          ...state.app,
          theme: state.app.theme === 'dark' ? 'light' : 'dark'
        }
      }

    case 'app/setActiveView':
      return {
        ...state,
        app: {
          ...state.app,
          activeView: command.view
        }
      }

    default:
      return null
  }
}

