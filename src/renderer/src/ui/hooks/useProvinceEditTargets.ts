import { useMemo } from 'react'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import {
  selectProvinceDraftTargetMaps,
  selectEffectiveProvinceCatalog,
  type ProvinceDraftTargetMaps
} from '../../infra/store/provinceEditSelectors'
import type { ProvinceCatalogEntry } from '../../../../shared/provinceCatalog'

export interface ProvinceEditTargets {
  draftTargetMaps: ProvinceDraftTargetMaps
  effectiveCatalog: ProvinceCatalogEntry[]
}

export function useProvinceEditTargets(): ProvinceEditTargets {
  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const pendingEdits = useMapDataStore((s) => s.pendingEdits)
  const pendingBmpOnlyEdits = useMapDataStore((s) => s.pendingBmpOnlyEdits)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const pendingNewProvinces = useMapDataStore((s) => s.pendingNewProvinces)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)
  const provinceCatalog = useMapDataStore((s) => s.provinceCatalog)

  const draftTargetMaps = useMemo(
    () => selectProvinceDraftTargetMaps(
      originalDefinitions,
      pendingEdits,
      pendingBmpOnlyEdits,
      bmpReplacements,
      pendingNewProvinces,
      bmpOnlyEntries
    ),
    [originalDefinitions, pendingEdits, pendingBmpOnlyEdits, bmpReplacements, pendingNewProvinces, bmpOnlyEntries]
  )

  const effectiveCatalog = useMemo(
    () => selectEffectiveProvinceCatalog(
      originalDefinitions,
      pendingEdits,
      pendingBmpOnlyEdits,
      bmpReplacements,
      pendingNewProvinces,
      bmpOnlyEntries,
      provinceCatalog
    ),
    [originalDefinitions, pendingEdits, pendingBmpOnlyEdits, bmpReplacements, pendingNewProvinces, bmpOnlyEntries, provinceCatalog]
  )

  return { draftTargetMaps, effectiveCatalog }
}
