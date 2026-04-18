import type { Continent, Province, TerrainCategory } from '../../../../shared/mapDataTypes'
import type { CoreState } from '../contracts/CoreState'
import {
  getModeValueKey,
  getResolvedModeValueColor,
  listModeValues,
  type ConfigurableDisplayMode,
  type DisplayModeContext
} from '../../infra/config/displayModes'
import type { DisplayModeOverrides } from '../../infra/store/displayModeConfigStore'

export const selectDisplayMode = (state: CoreState) => state.map.displayMode

export function selectSelectedProvinceId(state: CoreState): number | null {
  return state.map.selection.kind === 'province' ? state.map.selection.provinceId : null
}

export function selectHighlightColor(
  state: CoreState,
  provinces: ReadonlyMap<number, Province>
): number | null {
  const provinceId = selectSelectedProvinceId(state)
  return provinceId === null ? null : (provinces.get(provinceId)?.color ?? null)
}

export function selectColorMap(
  state: CoreState,
  provinces: ReadonlyMap<number, Province>,
  overrides: DisplayModeOverrides,
  context: DisplayModeContext
): Map<number, number> | null {
  const displayMode = selectDisplayMode(state)
  if (displayMode === 'provinces' || provinces.size === 0) return null

  const colorMap = new Map<number, number>()
  for (const province of provinces.values()) {
    const valueKey = getModeValueKey(displayMode, province)
    if (!valueKey) continue
    colorMap.set(province.color, getResolvedModeValueColor(displayMode, valueKey, overrides, context))
  }

  return colorMap
}

export function selectModeValuesByMode(
  provinces: ReadonlyMap<number, Province>,
  overrides: DisplayModeOverrides,
  context: DisplayModeContext
): Partial<Record<ConfigurableDisplayMode, ReturnType<typeof listModeValues>>> {
  const configurableModes: ConfigurableDisplayMode[] = ['type', 'terrain', 'coastal', 'continent']
  return configurableModes.reduce<Partial<Record<ConfigurableDisplayMode, ReturnType<typeof listModeValues>>>>(
    (acc, mode) => {
      acc[mode] = listModeValues(mode, provinces, overrides, context)
      return acc
    },
    {}
  )
}

export function selectHoverTooltip(
  displayMode: CoreState['map']['displayMode'],
  province: Province | undefined,
  t: (key: string) => string
): { label: string; value: string } | null {
  if (!province) return null

  if (displayMode === 'provinces') {
    return { label: t('map.hover.provinceId'), value: province.id.toString() }
  }
  if (displayMode === 'type') {
    return { label: t('map.hover.type'), value: province.type }
  }
  if (displayMode === 'terrain') {
    return { label: t('map.hover.terrain'), value: province.terrain }
  }
  if (displayMode === 'coastal') {
    return {
      label: t('map.hover.coastal'),
      value: t(province.isCoastal ? 'mapValue.coastal' : 'mapValue.inland')
    }
  }

  return {
    label: t('map.hover.continent'),
    value: province.continent ? province.continent : t('mapValue.none')
  }
}
