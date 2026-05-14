import { memo, useState, useEffect } from 'react'
import { makeStyles, tokens, Button, Tooltip } from '@fluentui/react-components'
import { ChevronRightRegular } from '@fluentui/react-icons'
import { MapModePanel } from '../components/MapModePanel'
import { MapCanvas } from '../components/MapCanvas'
import { ProvincePanel } from '../components/provincePanel/ProvincePanel'
import { StatePanel } from '../components/statePanel/StatePanel'
import { ModeTabs } from '../components/ModeTabs'
import { ProvinceDetailPanel } from '../components/ProvinceDetailPanel'
import { StateDetailPanel } from '../components/statePanel/StateDetailPanel'
import { useMapDataStore } from '../../infra/store/mapDataStore'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100%'
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    width: '300px',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'hidden'
  },
  detailDrawer: {
    display: 'flex',
    flexDirection: 'column',
    width: '320px',
    flexShrink: 0,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'hidden'
  },
  viewport: {
    flex: 1,
    position: 'relative'
  },
  collapsedTab: {
    position: 'absolute',
    top: tokens.spacingVerticalS,
    left: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    width: '220px',
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'hidden'
  },
  sidebarTop: {
    padding: tokens.spacingVerticalM,
    flexShrink: 0
  }
})

export function MapView() {
  const styles = useStyles()
  const editorMode = useMapDataStore((s) => s.editorMode)
  const selectedStateId = useMapDataStore((s) => s.selectedStateId)
  const selectedProvinceIds = useMapDataStore((s) => s.selectedProvinceIds)
  const selectedBmpGuids = useMapDataStore((s) => s.selectedBmpGuids)

  const showDrawer = editorMode === 'states'
    ? selectedStateId !== null
    : selectedProvinceIds.length > 0 || selectedBmpGuids.length > 0

  const [detailCollapsed, setDetailCollapsed] = useState(false)

  useEffect(() => {
    if (!showDrawer) setDetailCollapsed(false)
  }, [showDrawer])

  return (
    <div className={styles.root}>
      <div className={styles.leftPanel}>
        <ModeTabs />
        {editorMode === 'provinces' ? <ProvincePanel /> : <StatePanel />}
      </div>
      {showDrawer && !detailCollapsed && (
        <div className={styles.detailDrawer}>
          {editorMode === 'provinces'
            ? <ProvinceDetailPanel onCollapse={() => setDetailCollapsed(true)} />
            : <StateDetailPanel onCollapse={() => setDetailCollapsed(true)} />}
        </div>
      )}
      <div className={styles.viewport}>
        {showDrawer && detailCollapsed && (
          <div className={styles.collapsedTab}>
            <Tooltip content="Expand detail panel" relationship="label" positioning="after">
              <Button
                size="small"
                appearance="subtle"
                icon={<ChevronRightRegular />}
                onClick={() => setDetailCollapsed(false)}
              />
            </Tooltip>
          </div>
        )}
        <StableMapCanvas />
      </div>
      <div className={styles.sidebar}>
        <MapSidebarTop className={styles.sidebarTop} />
      </div>
    </div>
  )
}

const StableMapCanvas = memo(function StableMapCanvas() {
  return <MapCanvas />
})

const MapSidebarTop = memo(function MapSidebarTop({ className }: { className: string }) {
  return (
    <div className={className}>
      <MapModePanel />
    </div>
  )
})
