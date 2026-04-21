import { useMemo } from 'react'
import { useCoreStore } from '../../infra/store/coreStore'
import { useDisplayModeConfigStore } from '../../infra/store/displayModeConfigStore'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import {
  getModeValueKey,
  getResolvedModeValueColor,
  isConfigurableDisplayMode,
  listModeValues,
  type ConfigurableDisplayMode,
  type DisplayMode,
  type DisplayModeContext,
  type DisplayModeProvince
} from '../../infra/config/displayModes'
import type { DisplayModeOverrides } from '../../infra/store/displayModeConfigStore'
import type { ProvinceDraftTarget } from '../../../../shared/provinceEditing'

export type ModeValuesByMode = Partial<Record<ConfigurableDisplayMode, ReturnType<typeof listModeValues>>>

export interface MapDisplayModeState {
  displayMode: DisplayMode
  displayModeContext: DisplayModeContext
  displayModeOverrides: DisplayModeOverrides
  colorMap: Map<number, number> | null
  modeValuesByMode: ModeValuesByMode
  setDisplayMode: (mode: DisplayMode) => void
}

function computeColorMap(
  displayMode: DisplayMode,
  provinces: ReadonlyMap<number, DisplayModeProvince>,
  overrides: DisplayModeOverrides,
  context: DisplayModeContext
): Map<number, number> | null {
  if (displayMode === 'provinces' || provinces.size === 0) return null
  const colorMap = new Map<number, number>()
  for (const province of provinces.values()) {
    const valueKey = getModeValueKey(displayMode, province, context)
    if (!valueKey) continue
    colorMap.set(province.color, getResolvedModeValueColor(displayMode, valueKey, overrides, context))
  }
  return colorMap
}

function computeModeValuesByMode(
  provinces: ReadonlyMap<number, DisplayModeProvince>,
  overrides: DisplayModeOverrides,
  context: DisplayModeContext
): ModeValuesByMode {
  const configurableModes: ConfigurableDisplayMode[] = ['type', 'terrain', 'coastal', 'continent']
  return configurableModes.reduce<ModeValuesByMode>((acc, mode) => {
    acc[mode] = listModeValues(mode, provinces, overrides, context)
    return acc
  }, {})
}

export function useMapDisplayMode(
  provincesByColor: ReadonlyMap<number, ProvinceDraftTarget>
): MapDisplayModeState {
  const displayMode = useCoreStore((s) => s.displayMode)
  const setDisplayMode = useCoreStore((s) => s.setDisplayMode)
  const displayModeOverrides = useDisplayModeConfigStore((s) => s.overrides)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const stateProvinceToStateId = useMapDataStore((s) => s.stateProvinceToStateId)
  const strategicRegionProvinceToRegionId = useMapDataStore((s) => s.strategicRegionProvinceToRegionId)

  const displayModeContext = useMemo<DisplayModeContext>(
    () => ({ terrains, continents, stateProvinceToStateId, strategicRegionProvinceToRegionId }),
    [terrains, continents, stateProvinceToStateId, strategicRegionProvinceToRegionId]
  )

  const colorMap = useMemo(
    () => computeColorMap(displayMode, provincesByColor, displayModeOverrides, displayModeContext),
    [displayMode, provincesByColor, displayModeOverrides, displayModeContext]
  )

  const modeValuesByMode = useMemo(
    () => computeModeValuesByMode(provincesByColor, displayModeOverrides, displayModeContext),
    [provincesByColor, displayModeOverrides, displayModeContext]
  )

  return { displayMode, displayModeContext, displayModeOverrides, colorMap, modeValuesByMode, setDisplayMode }
}
