import type { OverlayId } from '../../core/contracts/MapOverlay'

export interface OverlayColorGroup {
  id: string
  label: string
  colors: string[]
}

export interface OverlayFilterRuleTemplate {
  target: {
    kind: 'group'
    groupId: string
  } | {
    kind: 'custom'
    colors: string[]
  }
  visible?: boolean
  opacity?: number
  color?: string | null
}

export interface OverlayConfiguration {
  overlayId: OverlayId
  groups: OverlayColorGroup[]
  defaultFilterRules?: OverlayFilterRuleTemplate[]
}
