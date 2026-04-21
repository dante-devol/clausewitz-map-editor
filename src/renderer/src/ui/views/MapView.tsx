import { memo } from 'react'
import { makeStyles, tokens } from '@fluentui/react-components'
import { DisplayModeControl } from '../components/DisplayModeControl'
import { MapModePanel } from '../components/MapModePanel'
import { MapCanvas } from '../components/MapCanvas'
import { ProvincePanel } from '../components/provincePanel/ProvincePanel'
import { ProvinceDetailPanel } from '../components/ProvinceDetailPanel'
import { useOverlayAssets } from '../hooks/useOverlayAssets'
import { useMapViewportState } from '../hooks/useMapViewportState'

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

  return (
    <div className={styles.root}>
      <div className={styles.leftPanel}>
        <ProvincePanel />
        <ProvinceDetailPanel />
      </div>
      <MapViewportPane className={styles.viewport} />
      <div className={styles.sidebar}>
        <MapSidebarTop className={styles.sidebarTop} />
      </div>
    </div>
  )
}

const MapViewportPane = memo(function MapViewportPane({ className }: { className: string }) {
  const { canvasOverlays } = useOverlayAssets()

  const {
    src,
    colorMap,
    highlightColors,
    validationWarningColors,
    validationErrorColors,
    activeTool,
    eyedropEnabled,
    bucketEnabled,
    sampledValueColor,
    sampledValueLabel,
    notifications,
    displayMode,
    modeValuesByMode,
    onDismissNotification,
    onActiveToolChange,
    onMapClick,
    hoverTooltipPosition,
    hoverTooltip,
    onHoverColorChange,
    onDisplayModeChange,
  } = useMapViewportState()

  return (
    <div className={className}>
      <MapCanvas
        src={src}
        overlays={canvasOverlays}
        highlightColors={highlightColors}
        validationWarningColors={validationWarningColors}
        validationErrorColors={validationErrorColors}
        colorMap={colorMap}
        activeTool={activeTool}
        eyedropEnabled={eyedropEnabled}
        bucketEnabled={bucketEnabled}
        sampledValueColor={sampledValueColor}
        sampledValueLabel={sampledValueLabel}
        notifications={notifications}
        onDismissNotification={onDismissNotification}
        onActiveToolChange={onActiveToolChange}
        onMapClick={onMapClick}
        hoverTooltipPosition={hoverTooltipPosition}
        hoverTooltip={hoverTooltip}
        onHoverColorChange={onHoverColorChange}
        topRightContent={(
          <DisplayModeControl
            mode={displayMode}
            onModeChange={onDisplayModeChange}
            valuesByMode={modeValuesByMode}
          />
        )}
      />
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
