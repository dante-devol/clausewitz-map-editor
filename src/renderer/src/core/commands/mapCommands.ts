import type { DisplayMode } from '../../config/displayModes'
import type { OverlayFilterRule, OverlayId } from '../contracts/MapOverlay'

export const mapCommands = {
  setDisplayMode: (mode: DisplayMode) => ({ type: 'map/setDisplayMode' as const, mode }),
  setOverlayVisibility: (overlayId: OverlayId, visible: boolean) => (
    { type: 'map/setOverlayVisibility' as const, overlayId, visible }
  ),
  setOverlayOpacity: (overlayId: OverlayId, opacity: number) => (
    { type: 'map/setOverlayOpacity' as const, overlayId, opacity }
  ),
  setOverlayFilterRules: (overlayId: OverlayId, rules: OverlayFilterRule[]) => (
    { type: 'map/setOverlayFilterRules' as const, overlayId, rules }
  ),
  moveOverlay: (overlayId: OverlayId, targetOverlayId: OverlayId) => (
    { type: 'map/moveOverlay' as const, overlayId, targetOverlayId }
  ),
  selectProvince: (provinceId: number) => ({ type: 'map/selectProvince' as const, provinceId }),
  clearSelection: () => ({ type: 'map/clearSelection' as const })
}
