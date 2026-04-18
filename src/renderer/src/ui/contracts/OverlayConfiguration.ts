import type { OverlayId } from '../../core/contracts/MapOverlay'

export interface OverlayColorGroup {
  id: string
  label: string
  colors: string[]
}

export interface OverlayConfiguration {
  overlayId: OverlayId
  groups: OverlayColorGroup[]
}
