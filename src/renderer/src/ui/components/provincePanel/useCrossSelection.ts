import { useMemo } from 'react'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import {
  selectPendingChanges,
  resolveSelection
} from '../../../infra/store/provinceEditSelectors'
import type { PendingChange, SelectionOrigin } from '../../../../../shared/provinceEditing'

interface CrossSelectionResult {
  changes: PendingChange[]
  canonicalId: number | undefined
  bmpGuid: string | undefined
  changeId: string | undefined
  setSelection: (origin: SelectionOrigin | null) => void
}

export function useCrossSelection(): CrossSelectionResult {
  const pendingEdits = useMapDataStore((s) => s.pendingEdits)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const pendingNewProvinces = useMapDataStore((s) => s.pendingNewProvinces)
  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)
  const provinceSelection = useMapDataStore((s) => s.provinceSelection)
  const setSelection = useMapDataStore((s) => s.setProvinceSelection)

  const changes = useMemo(
    () => selectPendingChanges(pendingEdits, bmpReplacements, pendingNewProvinces, originalDefinitions, bmpOnlyEntries),
    [pendingEdits, bmpReplacements, pendingNewProvinces, originalDefinitions, bmpOnlyEntries]
  )

  const resolved = useMemo(
    () => provinceSelection ? resolveSelection(provinceSelection, changes) : {},
    [provinceSelection, changes]
  )

  return {
    changes,
    canonicalId: resolved.canonicalId,
    bmpGuid: resolved.bmpGuid,
    changeId: resolved.changeId,
    setSelection
  }
}
