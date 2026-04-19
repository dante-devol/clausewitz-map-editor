import { memo, useCallback, useMemo, useState } from 'react'
import { makeStyles, tokens, Divider } from '@fluentui/react-components'
import { useCoreApi } from '../../bridge/CoreProvider'
import { useMapQueryApi } from '../../bridge/MapQueryProvider'
import { useCoreSelector } from '../../bridge/useCoreSelector'
import { MapModePanel } from '../components/MapModePanel'
import { MapCanvas } from '../components/MapCanvas'
import { ProvinceList } from '../components/ProvinceList'
import { mapCommands } from '../../core/commands/mapCommands'
import {
  selectColorMap,
  selectDisplayMode,
  selectHighlightColors,
  selectHoverTooltip,
  selectMapOverlays,
  selectModeValuesByMode,
  selectSelectedProvinceIds
} from '../../core/selectors/mapSelectors'
import { useI18n } from '../i18n/I18nProvider'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { useDisplayModeConfigStore } from '../../infra/store/displayModeConfigStore'
import { useProjectStore } from '../../infra/store/projectStore'
import { useOverlayAssets } from '../hooks/useOverlayAssets'
import { packColor } from '../../../../shared/mapDataTypes'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100%'
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
  id: number
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
      <MapViewportPane className={styles.viewport} canvasOverlays={canvasOverlays} />
      <div className={styles.sidebar}>
        <MapSidebarTop className={styles.sidebarTop} panelOverlays={panelOverlays} />
        <Divider style={{ flexGrow: 0 }} />
        <ProvinceListPane />
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
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const displayModeOverrides = useDisplayModeConfigStore((s) => s.overrides)
  const displayMode = useCoreSelector(selectDisplayMode)

  const src = provincesImageB64 ? `data:image/bmp;base64,${provincesImageB64}` : null
  const displayModeContext = useMemo(() => ({ terrains, continents }), [terrains, continents])

  const highlightColors = useCoreSelector((state) => selectHighlightColors(state, provinces))
  const colorMap = useCoreSelector((state) => selectColorMap(state, provinces, displayModeOverrides, displayModeContext))

  const onColorPicked = useCallback((r: number, g: number, b: number, additive: boolean) => {
    const province = query.getProvinceByColor(packColor(r, g, b))
    if (!province) return
    api.dispatch(additive
      ? mapCommands.toggleProvinceSelection(province.id)
      : mapCommands.setSelection([province.id])
    )
  }, [api, query])

  const onHoverColorChange = useCallback((color: { r: number; g: number; b: number; x: number; y: number } | null) => {
    if (!color) {
      setHoveredProvince(null)
      return
    }
    const province = query.getProvinceByColor(packColor(color.r, color.g, color.b))
    if (!province) {
      setHoveredProvince(null)
      return
    }
    setHoveredProvince({ id: province.id, x: color.x, y: color.y })
  }, [query])

  const resolvedHoverTooltip = useMemo(() => {
    if (!hoveredProvince) return null
    return selectHoverTooltip(
      displayMode,
      query.getProvinceById(hoveredProvince.id),
      t as (key: string) => string
    )
  }, [displayMode, hoveredProvince, query, t])

  return (
    <div className={className}>
      <MapCanvas
        src={src}
        overlays={canvasOverlays}
        highlightColors={highlightColors}
        colorMap={colorMap}
        onColorPicked={onColorPicked}
        hoverTooltipPosition={hoveredProvince ? { x: hoveredProvince.x, y: hoveredProvince.y } : null}
        hoverTooltip={resolvedHoverTooltip}
        onHoverColorChange={onHoverColorChange}
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
  const provinces = useMapDataStore((s) => s.provinces)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const displayModeOverrides = useDisplayModeConfigStore((s) => s.overrides)
  const displayMode = useCoreSelector(selectDisplayMode)

  const displayModeContext = useMemo(() => ({ terrains, continents }), [terrains, continents])
  const modeValuesByMode = useMemo(
    () => selectModeValuesByMode(provinces, displayModeOverrides, displayModeContext),
    [provinces, displayModeOverrides, displayModeContext]
  )

  return (
    <div className={className}>
      <MapModePanel
        mode={displayMode}
        onModeChange={(mode) => api.dispatch(mapCommands.setDisplayMode(mode))}
        valuesByMode={modeValuesByMode}
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
  const api = useCoreApi()
  const provinces = useMapDataStore((s) => s.provinces)
  const selectedProvinceIds = useCoreSelector(selectSelectedProvinceIds)

  return (
    <ProvinceList
      provinces={provinces}
      selectedIds={selectedProvinceIds}
      onSelect={(provinceId) => api.dispatch(mapCommands.setSelection([provinceId]))}
    />
  )
})
