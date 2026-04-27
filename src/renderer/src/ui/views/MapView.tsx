import { memo } from 'react'
import { makeStyles, tokens } from '@fluentui/react-components'
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

  return (
    <div className={styles.root}>
      <div className={styles.leftPanel}>
        <ModeTabs />
        {editorMode === 'provinces' ? <ProvincePanel /> : <StatePanel />}
      </div>
      {showDrawer && (
        <div className={styles.detailDrawer}>
          {editorMode === 'provinces' ? <ProvinceDetailPanel /> : <StateDetailPanel />}
        </div>
      )}
      <MapViewportPane className={styles.viewport} />
      <div className={styles.sidebar}>
        <MapSidebarTop className={styles.sidebarTop} />
      </div>
    </div>
  )
}


const MapViewportPane = memo(function MapViewportPane({ className }: { className: string }) {
  return (
    <div className={className}>
      <MapCanvas />
    </div>
  )
})

const MapSidebarTop = memo(function MapSidebarTop({ className }: { className: string }) {
  return (
    <div className={className}>
      <MapModePanel />
    </div>
  )
})
