import type { Theme, View } from '../contracts/CoreState'

export const appCommands = {
  setTheme: (theme: Theme) => ({ type: 'app/setTheme' as const, theme }),
  toggleTheme: () => ({ type: 'app/toggleTheme' as const }),
  setActiveView: (view: View) => ({ type: 'app/setActiveView' as const, view })
}

