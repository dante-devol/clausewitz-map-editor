import { memo, useCallback, useMemo, useState } from 'react'
import { makeStyles, tokens } from '@fluentui/react-components'
import { useCoreApi } from '../../bridge/CoreProvider'
import { useMapQueryApi } from '../../bridge/MapQueryProvider'
import { useCoreSelector } from '../../bridge/useCoreSelector'
import { DisplayModeControl } from '../components/DisplayModeControl'
import { MapModePanel } from '../components/MapModePanel'
import { MapCanvas } from '../components/MapCanvas'
import { ProvincePanel } from '../components/provincePanel/ProvincePanel'
import { ProvinceDetailPanel } from '../components/ProvinceDetailPanel'
import { mapCommands } from '../../core/commands/mapCommands'
import {
  selectColorMap,
  selectDisplayMode,
  selectHighlightColors,
  selectHoverTooltip,
  selectMapOverlays,
  selectModeValuesByMode,
  selectValidationHighlightColors
} from '../../core/selectors/mapSelectors'
import { useI18n } from '../i18n/I18nProvider'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { useDisplayModeConfigStore } from '../../infra/store/displayModeConfigStore'
import { useProjectStore } from '../../infra/store/projectStore'
import { useOverlayAssets } from '../hooks/useOverlayAssets'
import { packColor } from '../../../../shared/mapDataTypes'
import { useProvinceValidationStore } from '../../infra/store/provinceValidationStore'

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

interface HoveredProvince {
  color: number
  x: number
  y: number
}

export function MapView() {
  const styles = useStyles()
  const overlayStates = useCoreSelector(selectMapOverlays)
  const resolvedPaths = useProjectStore((s) => s.resolvedPaths)
  const { panelOverlays, canvasOverlays } = useOverlayAssets(overlayStates, resolvedPaths)

  return (
    <div className={styles.root}>
      <div className={styles.leftPanel}>
        <ProvinceListPane />
        <ProvinceDetailPane />
      </div>
      <MapViewportPane className={styles.viewport} canvasOverlays={canvasOverlays} />
      <div className={styles.sidebar}>
        <MapSidebarTop className={styles.sidebarTop} panelOverlays={panelOverlays} />
      </div>
    </div>
  )
}

const MapViewportPane = memo(function MapViewportPane({
  className,
  canvasOverlays
}: {
  className: string
  canvasOverlays: ReturnType<typeof useOverlayAssets>['canvasOverlays']
}) {
  const { t } = useI18n()
  const api = useCoreApi()
  const query = useMapQueryApi()
  const [hoveredProvince, setHoveredProvince] = useState<HoveredProvince | null>(null)

  const provincesImageB64 = useMapDataStore((s) => s.provincesImageB64)
  const provinces = useMapDataStore((s) => s.provinces)
  const provinceCatalog = useMapDataStore((s) => s.provinceCatalog)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const stateProvinceToStateId = useMapDataStore((s) => s.stateProvinceToStateId)
  const strategicRegionProvinceToRegionId = useMapDataStore((s) => s.strategicRegionProvinceToRegionId)
  const selectedProvinceIds = useMapDataStore((s) => s.selectedProvinceIds)
  const selectedBmpGuids = useMapDataStore((s) => s.selectedBmpGuids)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const setSelection = useMapDataStore((s) => s.setSelection)
  const extendSelection = useMapDataStore((s) => s.extendSelection)
  const setSelectedBmpGuids = useMapDataStore((s) => s.setSelectedBmpGuids)
  const toggleBmpGuid = useMapDataStore((s) => s.toggleBmpGuid)
  const issuesByProvinceKey = useProvinceValidationStore((s) => s.issuesByProvinceKey)
  const displayModeOverrides = useDisplayModeConfigStore((s) => s.overrides)
  const displayMode = useCoreSelector(selectDisplayMode)

  const src = provincesImageB64 ? `data:image/bmp;base64,${provincesImageB64}` : null
  const displayModeContext = useMemo(
    () => ({ terrains, continents, stateProvinceToStateId, strategicRegionProvinceToRegionId }),
    [terrains, continents, stateProvinceToStateId, strategicRegionProvinceToRegionId]
  )
  const modeValuesByMode = useMemo(
    () => selectModeValuesByMode(provinces, displayModeOverrides, displayModeContext),
    [provinces, displayModeOverrides, displayModeContext]
  )

  const highlightColors = useMemo(
    () => selectHighlightColors(selectedProvinceIds, selectedBmpGuids, provinces, bmpOnlyEntries, bmpReplacements),
    [selectedProvinceIds, selectedBmpGuids, provinces, bmpOnlyEntries, bmpReplacements]
  )

  const validationHighlightColors = useMemo(
    () => selectValidationHighlightColors(selectedProvinceIds, provinceCatalog, issuesByProvinceKey),
    [selectedProvinceIds, provinceCatalog, issuesByProvinceKey]
  )

  const colorMap = useCoreSelector((state) => selectColorMap(state, provinces, displayModeOverrides, displayModeContext))

  const onColorPicked = useCallback((r: number, g: number, b: number, additive: boolean) => {
    const draft = query.getDraftProvinceByColor(packColor(r, g, b))
    if (!draft) return
    if (draft.provinceId !== null) {
      if (additive) {
        extendSelection([draft.provinceId])
      } else {
        setSelection([draft.provinceId])
      }
      return
    }

    if (draft.bmpGuid === null) return
    if (additive) {
      toggleBmpGuid(draft.bmpGuid)
    } else {
      setSelectedBmpGuids([draft.bmpGuid])
    }
  }, [setSelectedBmpGuids, setSelection, extendSelection, query, toggleBmpGuid])

  const onHoverColorChange = useCallback((color: { r: number; g: number; b: number; x: number; y: number } | null) => {
    if (!color) {
      setHoveredProvince(null)
      return
    }
    const draft = query.getDraftProvinceByColor(packColor(color.r, color.g, color.b))
    if (!draft) {
      setHoveredProvince(null)
      return
    }
    setHoveredProvince({ color: packColor(color.r, color.g, color.b), x: color.x, y: color.y })
  }, [query])

  const resolvedHoverTooltip = useMemo(() => {
    if (!hoveredProvince) return null
    return selectHoverTooltip(
      displayMode,
      query.getDraftProvinceByColor(hoveredProvince.color),
      displayModeContext,
      t as (key: string) => string
    )
  }, [displayMode, displayModeContext, hoveredProvince, query, t])

  return (
    <div className={className}>
      <MapCanvas
        src={src}
        overlays={canvasOverlays}
        highlightColors={highlightColors}
        validationWarningColors={validationHighlightColors.warningColors}
        validationErrorColors={validationHighlightColors.errorColors}
        colorMap={colorMap}
        onColorPicked={onColorPicked}
        hoverTooltipPosition={hoveredProvince ? { x: hoveredProvince.x, y: hoveredProvince.y } : null}
        hoverTooltip={resolvedHoverTooltip}
        onHoverColorChange={onHoverColorChange}
        topRightContent={(
          <DisplayModeControl
            mode={displayMode}
            onModeChange={(mode) => api.dispatch(mapCommands.setDisplayMode(mode))}
            valuesByMode={modeValuesByMode}
          />
        )}
      />
    </div>
  )
})

const MapSidebarTop = memo(function MapSidebarTop({
  className,
  panelOverlays
}: {
  className: string
  panelOverlays: ReturnType<typeof useOverlayAssets>['panelOverlays']
}) {
  const api = useCoreApi()

  return (
    <div className={className}>
      <MapModePanel
        overlays={panelOverlays}
        onOverlayMove={(overlayId, targetOverlayId) => api.dispatch(mapCommands.moveOverlay(overlayId, targetOverlayId))}
        onOverlayVisibilityChange={(overlayId, visible) => api.dispatch(mapCommands.setOverlayVisibility(overlayId, visible))}
        onOverlayOpacityChange={(overlayId, opacity) => api.dispatch(mapCommands.setOverlayOpacity(overlayId, opacity))}
        onOverlayFilterRulesChange={(overlayId, rules) => api.dispatch(mapCommands.setOverlayFilterRules(overlayId, rules))}
      />
    </div>
  )
})

const ProvinceListPane = memo(function ProvinceListPane() {
  return <ProvincePanel />
})

const ProvinceDetailPane = memo(function ProvinceDetailPane() {
  const provinceCatalog = useMapDataStore((s) => s.provinceCatalog)
  const selectedProvinceIds = useMapDataStore((s) => s.selectedProvinceIds)
  const selectedBmpGuids = useMapDataStore((s) => s.selectedBmpGuids)

  return (
    <ProvinceDetailPanel
      selectedProvinceIds={selectedProvinceIds}
      selectedBmpGuids={selectedBmpGuids}
      provinceCatalog={provinceCatalog}
    />
  )
})
