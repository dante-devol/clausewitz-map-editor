import type { DisplayMode } from '../../config/displayModes'
import type { SessionLifecycle } from './SessionLifecycle'

export type Theme = 'dark' | 'light'
export type View = 'map' | 'provinces' | 'settings'

export type MapSelection =
  | { kind: 'none' }
  | { kind: 'province'; provinceId: number }

export interface CoreState {
  app: {
    theme: Theme
    activeView: View
  }
  session: SessionLifecycle
  map: {
    displayMode: DisplayMode
    selection: MapSelection
  }
}

export const INITIAL_CORE_STATE: CoreState = {
  app: {
    theme: 'dark',
    activeView: 'map'
  },
  session: {
    status: 'idle',
    projectId: null,
    projectPath: null,
    errorMessage: null
  },
  map: {
    displayMode: 'provinces',
    selection: { kind: 'none' }
  }
}
