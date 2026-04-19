import { useMemo, useState } from 'react'
import { makeStyles } from '@fluentui/react-components'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { CanonicalProvinceList } from './CanonicalProvinceList'
import { BmpOnlyList } from './BmpOnlyList'
import { ChangesList } from './ChangesList'
import { useCrossSelection } from './useCrossSelection'
import type { BmpAssignment } from '../../../../../shared/provinceEditing'

const useStyles = makeStyles({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'hidden'
  }
})

export function ProvincePanel(): JSX.Element {
  const styles = useStyles()

  const provinceCatalog = useMapDataStore((s) => s.provinceCatalog)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const pendingNewProvinces = useMapDataStore((s) => s.pendingNewProvinces)
  const revertEdit = useMapDataStore((s) => s.revertEdit)
  const revertBmpReplacement = useMapDataStore((s) => s.revertBmpReplacement)
  const revertNewProvince = useMapDataStore((s) => s.revertNewProvince)
  const clearAllSelection = useMapDataStore((s) => s.clearAllSelection)

  const { changes, crossSelectedProvinceIds, crossSelectedBmpGuids, crossSelectedChangeId } = useCrossSelection()

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

  const handleRevert = (id: string) => {
    if (id.startsWith('field-edit:')) {
      revertEdit(parseInt(id.slice('field-edit:'.length), 10))
    } else if (id.startsWith('bmp-replacement:')) {
      revertBmpReplacement(parseInt(id.slice('bmp-replacement:'.length), 10))
    } else if (id.startsWith('new-province:')) {
      revertNewProvince(id.slice('new-province:'.length))
    }
    clearAllSelection()
  }

  return (
    <div className={styles.panel}>
      <CanonicalProvinceList
        collapsed={canonicalCollapsed}
        onToggleCollapse={() => setCanonicalCollapsed((c) => !c)}
        provinceCatalog={provinceCatalog}
        crossSelectedIds={crossSelectedProvinceIds}
      />
      <BmpOnlyList
        collapsed={bmpCollapsed}
        onToggleCollapse={() => setBmpCollapsed((c) => !c)}
        entries={bmpOnlyEntries}
        bmpAssignments={bmpAssignments}
        crossSelectedGuids={crossSelectedBmpGuids}
      />
      <ChangesList
        collapsed={changesCollapsed}
        onToggleCollapse={() => setChangesCollapsed((c) => !c)}
        changes={changes}
        crossSelectedChangeId={crossSelectedChangeId}
        onRevert={handleRevert}
      />
    </div>
  )
}
