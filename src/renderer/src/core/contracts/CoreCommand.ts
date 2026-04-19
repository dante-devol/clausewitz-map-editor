import type { DisplayMode } from '../../infra/config/displayModes'
import type { OverlayFilterRule, OverlayId } from './MapOverlay'
import type { Theme, View } from './CoreState'

export type CoreCommand =
  | { type: 'app/setTheme'; theme: Theme }
  | { type: 'app/toggleTheme' }
  | { type: 'app/setActiveView'; view: View }
  | { type: 'session/openProjectStarted'; projectPath: string }
  | { type: 'session/projectOpened'; projectId: string; projectPath: string }
  | { type: 'session/mapLoadingStarted' }
  | { type: 'session/mapReady' }
  | { type: 'session/failed'; message: string }
  | { type: 'session/cleared' }
  | { type: 'map/setDisplayMode'; mode: DisplayMode }
  | { type: 'map/setOverlayVisibility'; overlayId: OverlayId; visible: boolean }
  | { type: 'map/setOverlayOpacity'; overlayId: OverlayId; opacity: number }
  | { type: 'map/setOverlayFilterRules'; overlayId: OverlayId; rules: OverlayFilterRule[] }
  | { type: 'map/moveOverlay'; overlayId: OverlayId; targetOverlayId: OverlayId }
