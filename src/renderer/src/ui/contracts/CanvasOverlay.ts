import type { OverlayFilterRule } from '../../core/contracts/MapOverlay'
import type { OverlayConfiguration } from './OverlayConfiguration'

export interface BitmapCanvasOverlay {
  id: string
  kind: 'bitmap'
  src: string
  visible: boolean
  opacity: number
  configuration: OverlayConfiguration
  filterRules: OverlayFilterRule[]
}

export interface OutlineCanvasOverlay {
  id: string
  kind: 'outline'
  visible: boolean
  opacity: number
  lineColor: string
  source: ImageBitmap | OffscreenCanvas
}

export type CanvasOverlay = BitmapCanvasOverlay | OutlineCanvasOverlay
