import type { OverlayFilterRule } from '../../core/contracts/MapOverlay'
import type { OverlayConfiguration } from './OverlayConfiguration'

export interface CanvasOverlay {
  id: string
  src: string
  visible: boolean
  opacity: number
  configuration: OverlayConfiguration
  filterRules: OverlayFilterRule[]
}
