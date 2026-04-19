import type { ProvinceCatalogEntry, ProvinceCatalogEntryKey } from '../../../../shared/provinceCatalog'
import type { BmpOnlyEntry, ProvinceDraftTarget } from '../../../../shared/provinceEditing'
import type { CoreState } from '../contracts/CoreState'
import {
  getModeValueKey,
  getResolvedModeValueColor,
  listModeValues,
  type ConfigurableDisplayMode,
  type DisplayModeContext,
  type DisplayModeProvince
} from '../../infra/config/displayModes'
import type { DisplayModeOverrides } from '../../infra/store/displayModeConfigStore'
import type { ProvinceValidationIssue } from '../../../../shared/provinceValidation'

export const selectDisplayMode = (state: CoreState) => state.map.displayMode
export const selectMapOverlays = (state: CoreState) => state.map.overlays

export function selectHighlightColors(
  selectedProvinceIds: number[],
  selectedBmpGuids: string[],
  provinces: ReadonlyMap<number, DisplayModeProvince>,
  bmpOnlyEntries: BmpOnlyEntry[],
  bmpReplacements: ReadonlyMap<number, string>
): number[] {
  const colors: number[] = []
  const bmpEntryByGuid = new Map(bmpOnlyEntries.map((e) => [e.guid, e]))

  // Colors from canonical province selections
  for (const id of selectedProvinceIds) {
    const replacingGuid = bmpReplacements.get(id)
    const color = replacingGuid
      ? bmpEntryByGuid.get(replacingGuid)?.color
      : provinces.get(id)?.color
    if (color !== undefined) colors.push(color)
  }

  // Colors from BMP-only guid selections
  // For each selected BMP guid:
  //   - If it has a bmpReplacement (province assigned), show the province's original color (since after assignment the map shows that)
  //   - Otherwise show the direct BMP color from bmpOnlyEntries
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
  _selectedProvinceIds: number[],
  provinceCatalog: readonly ProvinceCatalogEntry[],
  issuesByProvinceKey: ReadonlyMap<string, ProvinceValidationIssue[]>
): { warningColors: number[]; errorColors: number[] } {
  const warningColors: number[] = []
  const errorColors: number[] = []

  for (const province of provinceCatalog) {
    const issues = issuesByProvinceKey.get(province.key as ProvinceCatalogEntryKey)
    if (!issues || issues.length === 0) continue
    if (province.color === null) continue

    const highestSeverity = resolveHighestSeverity(issues)
    if (highestSeverity === 'error') errorColors.push(province.color)
    else if (highestSeverity === 'warning') warningColors.push(province.color)
  }

  return { warningColors, errorColors }
}

export function selectColorMap(
  state: CoreState,
  provinces: ReadonlyMap<number, DisplayModeProvince>,
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
  provinces: ReadonlyMap<number, DisplayModeProvince>,
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
  province: ProvinceDraftTarget | undefined,
  context: DisplayModeContext,
  t: (key: string) => string
): { label: string; value: string } | null {
  if (!province) return null

  if (displayMode === 'provinces') {
    return province.provinceId !== null
      ? { label: t('map.hover.provinceId'), value: province.provinceId.toString() }
      : { label: t('map.hover.unregisteredProvince'), value: province.bmpGuid ?? t('mapValue.none') }
  }
  if (displayMode === 'type') {
    return { label: t('map.hover.type'), value: province.type ?? t('mapValue.none') }
  }
  if (displayMode === 'terrain') {
    return { label: t('map.hover.terrain'), value: province.terrain ?? t('mapValue.none') }
  }
  if (displayMode === 'coastal') {
    const value = province.isCoastal === undefined
      ? t('mapValue.none')
      : t(province.isCoastal ? 'mapValue.coastal' : 'mapValue.inland')
    return {
      label: t('map.hover.coastal'),
      value
    }
  }
  if (displayMode === 'state') {
    return {
      label: t('map.hover.state'),
      value: province.provinceId !== null
        ? (context.stateProvinceToStateId.get(province.provinceId)?.toString() ?? t('mapValue.none'))
        : t('mapValue.none')
    }
  }
  if (displayMode === 'strategicRegion') {
    return {
      label: t('map.hover.strategicRegion'),
      value: province.provinceId !== null
        ? (context.strategicRegionProvinceToRegionId.get(province.provinceId)?.toString() ?? t('mapValue.none'))
        : t('mapValue.none')
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
