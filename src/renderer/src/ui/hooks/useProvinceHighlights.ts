import { useMemo } from 'react'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { useProvinceValidationStore } from '../../infra/store/provinceValidationStore'
import type { ProvinceCatalogEntry, ProvinceCatalogEntryKey } from '../../../../shared/provinceCatalog'
import type { BmpOnlyEntry } from '../../../../shared/provinceEditing'
import type { Province } from '../../../../shared/mapDataTypes'
import type { ProvinceValidationIssue } from '../../../../shared/provinceValidation'

export interface ProvinceHighlights {
  highlightColors: number[]
  validationHighlightColors: { warningColors: number[]; errorColors: number[] }
}

function computeHighlightColors(
  selectedProvinceIds: number[],
  selectedBmpGuids: string[],
  provinces: ReadonlyMap<number, Province>,
  bmpOnlyEntries: BmpOnlyEntry[],
  bmpReplacements: ReadonlyMap<number, string>
): number[] {
  const colors: number[] = []
  const bmpEntryByGuid = new Map(bmpOnlyEntries.map((e) => [e.guid, e]))
  for (const id of selectedProvinceIds) {
    const replacingGuid = bmpReplacements.get(id)
    const color = replacingGuid ? bmpEntryByGuid.get(replacingGuid)?.color : provinces.get(id)?.color
    if (color !== undefined) colors.push(color)
  }
  const guidToProvinceId = new Map<string, number>()
  for (const [provinceId, guid] of bmpReplacements) guidToProvinceId.set(guid, provinceId)
  for (const guid of selectedBmpGuids) {
    const provinceId = guidToProvinceId.get(guid)
    if (provinceId !== undefined) {
      const color = provinces.get(provinceId)?.color
      if (color !== undefined) colors.push(color)
    } else {
      const entry = bmpEntryByGuid.get(guid)
      if (entry !== undefined) colors.push(entry.color)
    }
  }
  return colors
}

function computeValidationHighlightColors(
  provinceCatalog: readonly ProvinceCatalogEntry[],
  issuesByProvinceKey: ReadonlyMap<string, ProvinceValidationIssue[]>
): { warningColors: number[]; errorColors: number[] } {
  const warningColors: number[] = []
  const errorColors: number[] = []
  for (const province of provinceCatalog) {
    const issues = issuesByProvinceKey.get(province.key as ProvinceCatalogEntryKey)
    if (!issues || issues.length === 0 || province.color === null) continue
    let highestSeverity: ProvinceValidationIssue['severity'] | null = null
    for (const issue of issues) {
      if (issue.severity === 'error') { highestSeverity = 'error'; break }
      if (issue.severity === 'warning') highestSeverity = 'warning'
      else if (highestSeverity === null) highestSeverity = 'info'
    }
    if (highestSeverity === 'error') errorColors.push(province.color)
    else if (highestSeverity === 'warning') warningColors.push(province.color)
  }
  return { warningColors, errorColors }
}

export function useProvinceHighlights(
  effectiveCatalog: ProvinceCatalogEntry[]
): ProvinceHighlights {
  const provinces = useMapDataStore((s) => s.provinces)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const selectedProvinceIds = useMapDataStore((s) => s.selectedProvinceIds)
  const selectedBmpGuids = useMapDataStore((s) => s.selectedBmpGuids)
  const editorMode = useMapDataStore((s) => s.editorMode)
  const selectedStateId = useMapDataStore((s) => s.selectedStateId)
  const statesById = useMapDataStore((s) => s.statesById)
  const issuesByProvinceKey = useProvinceValidationStore((s) => s.issuesByProvinceKey)

  const highlightColors = useMemo(() => {
    if (editorMode === 'states') {
      if (selectedStateId === null) return []
      const state = statesById.get(selectedStateId)
      if (!state) return []
      const colors: number[] = []
      for (const provinceId of state.provinceIds) {
        const color = provinces.get(provinceId)?.color
        if (color !== undefined) colors.push(color)
      }
      return colors
    }
    return computeHighlightColors(selectedProvinceIds, selectedBmpGuids, provinces, bmpOnlyEntries, bmpReplacements)
  }, [editorMode, selectedStateId, statesById, selectedProvinceIds, selectedBmpGuids, provinces, bmpOnlyEntries, bmpReplacements])

  const validationHighlightColors = useMemo(
    () => computeValidationHighlightColors(effectiveCatalog, issuesByProvinceKey),
    [effectiveCatalog, issuesByProvinceKey]
  )

  return { highlightColors, validationHighlightColors }
}
