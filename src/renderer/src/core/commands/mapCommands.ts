import type { DisplayMode } from '../../config/displayModes'

export const mapCommands = {
  setDisplayMode: (mode: DisplayMode) => ({ type: 'map/setDisplayMode' as const, mode }),
  selectProvince: (provinceId: number) => ({ type: 'map/selectProvince' as const, provinceId }),
  clearSelection: () => ({ type: 'map/clearSelection' as const })
}

