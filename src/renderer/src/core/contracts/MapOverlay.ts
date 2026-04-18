export type OverlayId = 'rivers'

export interface OverlayFilterRule {
  id: string
  target: {
    kind: 'group'
    groupId: string
  } | {
    kind: 'custom'
    colors: string[]
  }
  visible: boolean
  opacity: number
  color: string | null
}

export interface MapOverlayState {
  id: OverlayId
  visible: boolean
  opacity: number
  filterRules: OverlayFilterRule[]
}

export const INITIAL_MAP_OVERLAYS: MapOverlayState[] = [
  {
    id: 'rivers',
    visible: false,
    opacity: 100,
    filterRules: []
  }
]
