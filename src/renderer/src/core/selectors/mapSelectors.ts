import type { Province } from '../../../../shared/mapDataTypes'
import type { ProvinceCatalogEntry, ProvinceCatalogEntryKey } from '../../../../shared/provinceCatalog'
import type { BmpOnlyEntry } from '../../../../shared/provinceEditing'
import type { CoreState } from '../contracts/CoreState'
import {
  getModeValueKey,
  getResolvedModeValueColor,
  listModeValues,
  type ConfigurableDisplayMode,
  type DisplayModeContext
} from '../../infra/config/displayModes'
import type { DisplayModeOverrides } from '../../infra/store/displayModeConfigStore'
import type { ProvinceValidationIssue } from '../../../../shared/provinceValidation'

export const selectDisplayMode = (state: CoreState) => state.map.displayMode
export const selectMapOverlays = (state: CoreState) => state.map.overlays

export function selectHighlightColors(
  selectedProvinceIds: number[],
  selectedBmpGuids: string[],
  provinces: ReadonlyMap<number, Province>,
  bmpOnlyEntries: BmpOnlyEntry[],
  bmpReplacements: ReadonlyMap<number, string>
): number[] {
  const colors: number[] = []

  // Colors from canonical province selections
  for (const id of selectedProvinceIds) {
    const color = provinces.get(id)?.color
    if (color !== undefined) colors.push(color)
  }

  // Colors from BMP-only guid selections
  // For each selected BMP guid:
  //   - If it has a bmpReplacement (province assigned), show the province's original color (since after assignment the map shows that)
  //   - Otherwise show the direct BMP color from bmpOnlyEntries
  const bmpEntryByGuid = new Map(bmpOnlyEntries.map((e) => [e.guid, e]))
  // Reverse lookup: bmp guid -> province id (if a replacement was assigned)
  const guidToProvinceId = new Map<string, number>()
  for (const [provinceId, guid] of bmpReplacements) {
    guidToProvinceId.set(guid, provinceId)
  }

  for (const guid of selectedBmpGuids) {
    const provinceId = guidToProvinceId.get(guid)
    if (provinceId !== undefined) {
      // After bmp replacement, the map shows the province's original color
      const color = provinces.get(provinceId)?.color
      if (color !== undefined) colors.push(color)
    } else {
      // Unassigned BMP: highlight the raw BMP color
      const entry = bmpEntryByGuid.get(guid)
      if (entry !== undefined) colors.push(entry.color)
    }
  }

  return colors
}

export function selectValidationHighlightColors(
  selectedProvinceIds: number[],
  provinceCatalog: readonly ProvinceCatalogEntry[],
  issuesByProvinceKey: ReadonlyMap<string, ProvinceValidationIssue[]>
): { warningColors: number[]; errorColors: number[] } {
  const selectedIds = new Set(selectedProvinceIds)
  const warningColors: number[] = []
  const errorColors: number[] = []

  for (const province of provinceCatalog) {
    const issues = issuesByProvinceKey.get(province.key as ProvinceCatalogEntryKey)
    if (!issues || issues.length === 0) continue
    if (province.color === null) continue
    if (province.id !== null && selectedIds.has(province.id)) continue

    const highestSeverity = resolveHighestSeverity(issues)
    if (highestSeverity === 'error') errorColors.push(province.color)
    else if (highestSeverity === 'warning') warningColors.push(province.color)
  }

  return { warningColors, errorColors }
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
    const valueKey = getModeValueKey(displayMode, province, context)
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
  context: DisplayModeContext,
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
  if (displayMode === 'state') {
    return {
      label: t('map.hover.state'),
      value: context.stateProvinceToStateId.get(province.id)?.toString() ?? t('mapValue.none')
    }
  }
  if (displayMode === 'strategicRegion') {
    return {
      label: t('map.hover.strategicRegion'),
      value: context.strategicRegionProvinceToRegionId.get(province.id)?.toString() ?? t('mapValue.none')
    }
  }

  return {
    label: t('map.hover.continent'),
    value: province.continent ? province.continent : t('mapValue.none')
  }
}

function resolveHighestSeverity(
  issues: readonly ProvinceValidationIssue[]
): ProvinceValidationIssue['severity'] | null {
  let result: ProvinceValidationIssue['severity'] | null = null
  for (const issue of issues) {
    if (issue.severity === 'error') return 'error'
    if (issue.severity === 'warning') result = 'warning'
    else if (result === null) result = 'info'
  }
  return result
}
