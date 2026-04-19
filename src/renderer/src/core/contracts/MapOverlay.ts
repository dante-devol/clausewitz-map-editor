export type OverlayId = 'rivers' | 'provinces' | 'states' | 'strategicRegions'

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

interface BaseMapOverlayState {
  id: OverlayId
  visible: boolean
  opacity: number
}

export interface BitmapMapOverlayState extends BaseMapOverlayState {
  kind: 'bitmap'
  filterRules: OverlayFilterRule[]
}

export interface OutlineMapOverlayState extends BaseMapOverlayState {
  kind: 'outline'
  lineColor: string
}

export type MapOverlayState = BitmapMapOverlayState | OutlineMapOverlayState

export const INITIAL_MAP_OVERLAYS: MapOverlayState[] = [
  {
    id: 'rivers',
    kind: 'bitmap',
    visible: false,
    opacity: 100,
    filterRules: []
  },
  {
    id: 'provinces',
    kind: 'outline',
    visible: false,
    opacity: 100,
    lineColor: '#000000'
  },
  {
    id: 'states',
    kind: 'outline',
    visible: false,
    opacity: 100,
    lineColor: '#000000'
  },
  {
    id: 'strategicRegions',
    kind: 'outline',
    visible: false,
    opacity: 100,
    lineColor: '#000000'
  }
]
