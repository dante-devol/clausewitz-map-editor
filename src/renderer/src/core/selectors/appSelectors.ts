import type { CoreState } from '../contracts/CoreState'

export const selectTheme = (state: CoreState) => state.app.theme
export const selectActiveView = (state: CoreState) => state.app.activeView

