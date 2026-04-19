import { useMemo } from 'react'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { selectPendingChanges } from '../../../infra/store/provinceEditSelectors'
import type { PendingChange, BmpReplacement, NewProvince } from '../../../../../shared/provinceEditing'

interface CrossSelectionResult {
  changes: PendingChange[]
  crossSelectedProvinceIds: number[]
  crossSelectedBmpGuids: string[]
  crossSelectedChangeId: string | undefined
}

export function useCrossSelection(): CrossSelectionResult {
  const pendingEdits = useMapDataStore((s) => s.pendingEdits)
  const pendingBmpOnlyEdits = useMapDataStore((s) => s.pendingBmpOnlyEdits)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const pendingNewProvinces = useMapDataStore((s) => s.pendingNewProvinces)
  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)
  const selectedProvinceIds = useMapDataStore((s) => s.selectedProvinceIds)
  const selectedBmpGuids = useMapDataStore((s) => s.selectedBmpGuids)

  const changes = useMemo(
    () => selectPendingChanges(
      pendingEdits,
      pendingBmpOnlyEdits,
      bmpReplacements,
      pendingNewProvinces,
      originalDefinitions,
      bmpOnlyEntries
    ),
    [pendingEdits, pendingBmpOnlyEdits, bmpReplacements, pendingNewProvinces, originalDefinitions, bmpOnlyEntries]
  )

  // crossSelectedBmpGuids = selectedBmpGuids UNION guids that are bmpReplacements for any selectedProvinceId
  const crossSelectedBmpGuids = useMemo(() => {
    const guidSet = new Set(selectedBmpGuids)
    for (const id of selectedProvinceIds) {
      const guid = bmpReplacements.get(id)
      if (guid !== undefined) guidSet.add(guid)
    }
    return [...guidSet]
  }, [selectedBmpGuids, selectedProvinceIds, bmpReplacements])

  // crossSelectedChangeId = first change where:
  //   field-edit/bmp-replacement with provinceId in selectedProvinceIds, OR
  //   new-province with bmpGuid in selectedBmpGuids
  const crossSelectedChangeId = useMemo(() => {
    const provinceIdSet = new Set(selectedProvinceIds)
    const bmpGuidSet = new Set(selectedBmpGuids)
    const match = changes.find((c) => {
      if (c.kind === 'field-edit') return provinceIdSet.has(c.provinceId)
      if (c.kind === 'bmp-field-edit') return bmpGuidSet.has(c.bmpGuid)
      if (c.kind === 'bmp-replacement') return provinceIdSet.has((c as BmpReplacement).provinceId)
      if (c.kind === 'new-province') return bmpGuidSet.has((c as NewProvince).bmpGuid)
      return false
    })
    return match?.changeId
  }, [changes, selectedProvinceIds, selectedBmpGuids])

  return {
    changes,
    crossSelectedProvinceIds: selectedProvinceIds,
    crossSelectedBmpGuids,
    crossSelectedChangeId
  }
}
