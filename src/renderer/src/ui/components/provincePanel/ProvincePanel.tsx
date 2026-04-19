import { useState } from 'react'
import { makeStyles } from '@fluentui/react-components'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { CanonicalProvinceList } from './CanonicalProvinceList'
import { BmpOnlyList } from './BmpOnlyList'
import { ChangesList } from './ChangesList'
import { useCrossSelection } from './useCrossSelection'
import type { SelectionOrigin } from '../../../../../shared/provinceEditing'

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
  const pendingReassignments = useMapDataStore((s) => s.pendingReassignments)
  const revertEdit = useMapDataStore((s) => s.revertEdit)
  const revertReassignment = useMapDataStore((s) => s.revertReassignment)

  const { changes, canonicalId, bmpGuid, changeId, setSelection } = useCrossSelection()

  const [canonicalCollapsed, setCanonicalCollapsed] = useState(false)
  const [bmpCollapsed, setBmpCollapsed] = useState(false)
  const [changesCollapsed, setChangesCollapsed] = useState(false)

  const handleCrossSelect = (origin: SelectionOrigin) => setSelection(origin)

  const handleRevert = (id: string) => {
    if (id.startsWith('field-edit:')) {
      const provinceId = parseInt(id.slice('field-edit:'.length), 10)
      revertEdit(provinceId)
    } else if (id.startsWith('reassignment:')) {
      const guid = id.slice('reassignment:'.length)
      revertReassignment(guid)
    }
    // Clear selection if it pointed at the reverted change
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
        pendingReassignments={pendingReassignments}
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
