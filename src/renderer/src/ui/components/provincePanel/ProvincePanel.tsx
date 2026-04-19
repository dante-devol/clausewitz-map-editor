import { useMemo, useState } from 'react'
import { makeStyles } from '@fluentui/react-components'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { CanonicalProvinceList } from './CanonicalProvinceList'
import { BmpOnlyList } from './BmpOnlyList'
import { ChangesList } from './ChangesList'
import { useCrossSelection } from './useCrossSelection'
import type { BmpAssignment, SelectionOrigin } from '../../../../../shared/provinceEditing'

const useStyles = makeStyles({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'hidden'
  }
})

interface Props {
  selectedIds: number[]
  onSelect?: (id: number) => void
}

export function ProvincePanel({ selectedIds, onSelect }: Props): JSX.Element {
  const styles = useStyles()

  const provinceCatalog = useMapDataStore((s) => s.provinceCatalog)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const pendingNewProvinces = useMapDataStore((s) => s.pendingNewProvinces)
  const revertEdit = useMapDataStore((s) => s.revertEdit)
  const revertBmpReplacement = useMapDataStore((s) => s.revertBmpReplacement)
  const revertNewProvince = useMapDataStore((s) => s.revertNewProvince)

  const { changes, canonicalId, bmpGuid, changeId, setSelection } = useCrossSelection()

  const [canonicalCollapsed, setCanonicalCollapsed] = useState(false)
  const [bmpCollapsed, setBmpCollapsed] = useState(false)
  const [changesCollapsed, setChangesCollapsed] = useState(false)

  // Derive a guid-keyed assignment map for BmpOnlyList display
  const bmpAssignments = useMemo(() => {
    const map = new Map<string, BmpAssignment>()
    for (const [provinceId, guid] of bmpReplacements) {
      map.set(guid, { kind: 'replace', targetId: provinceId })
    }
    for (const [guid, assignedId] of pendingNewProvinces) {
      map.set(guid, { kind: 'register', assignedId })
    }
    return map
  }, [bmpReplacements, pendingNewProvinces])

  const handleCrossSelect = (origin: SelectionOrigin) => setSelection(origin)

  const handleRevert = (id: string) => {
    if (id.startsWith('field-edit:')) {
      revertEdit(parseInt(id.slice('field-edit:'.length), 10))
    } else if (id.startsWith('bmp-replacement:')) {
      revertBmpReplacement(parseInt(id.slice('bmp-replacement:'.length), 10))
    } else if (id.startsWith('new-province:')) {
      revertNewProvince(id.slice('new-province:'.length))
    }
    setSelection(null)
  }

  return (
    <div className={styles.panel}>
      <CanonicalProvinceList
        collapsed={canonicalCollapsed}
        onToggleCollapse={() => setCanonicalCollapsed((c) => !c)}
        provinceCatalog={provinceCatalog}
        selectedIds={selectedIds}
        crossSelectedId={canonicalId}
        onSelect={onSelect}
        onCrossSelect={handleCrossSelect}
      />
      <BmpOnlyList
        collapsed={bmpCollapsed}
        onToggleCollapse={() => setBmpCollapsed((c) => !c)}
        entries={bmpOnlyEntries}
        bmpAssignments={bmpAssignments}
        crossSelectedGuid={bmpGuid}
        onCrossSelect={handleCrossSelect}
      />
      <ChangesList
        collapsed={changesCollapsed}
        onToggleCollapse={() => setChangesCollapsed((c) => !c)}
        changes={changes}
        selectedChangeId={changeId}
        onCrossSelect={handleCrossSelect}
        onRevert={handleRevert}
      />
    </div>
  )
}
