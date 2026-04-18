import type { DisplayMode } from '../../config/displayModes'
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
  | { type: 'map/selectProvince'; provinceId: number }
  | { type: 'map/clearSelection' }
