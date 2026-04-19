import type { DisplayMode } from '../../infra/config/displayModes'
import { INITIAL_MAP_OVERLAYS, type MapOverlayState } from './MapOverlay'
import type { SessionLifecycle } from './SessionLifecycle'

export type Theme = 'dark' | 'light'
export type View = 'map' | 'provinces' | 'settings'

export interface CoreState {
  app: {
    theme: Theme
    activeView: View
  }
  session: SessionLifecycle
  map: {
    displayMode: DisplayMode
    overlays: MapOverlayState[]
    selectedProvinceIds: number[]
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
    overlays: INITIAL_MAP_OVERLAYS,
    selectedProvinceIds: []
  }
}
