import { useMemo, useCallback, useState } from 'react'
import { makeStyles, tokens, Divider } from '@fluentui/react-components'
import { useCoreApi } from '../../bridge/CoreProvider'
import { useMapQueryApi } from '../../bridge/MapQueryProvider'
import { useCoreSelector } from '../../bridge/useCoreSelector'
import { MapModePanel } from '../components/MapModePanel'
import { MapCanvas } from '../components/MapCanvas'
import { ProvinceList } from '../components/ProvinceList'
import { mapCommands } from '../../core/commands/mapCommands'
import { selectColorMap, selectDisplayMode, selectHighlightColor, selectHoverTooltip, selectModeValuesByMode, selectSelectedProvinceId } from '../../core/selectors/mapSelectors'
import { useI18n } from '../i18n/I18nProvider'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { useDisplayModeConfigStore } from '../../infra/store/displayModeConfigStore'
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
  const { t } = useI18n()
  const api = useCoreApi()
  const query = useMapQueryApi()
  const [hoveredProvince, setHoveredProvince] = useState<HoveredProvince | null>(null)

  const provincesImageB64 = useMapDataStore((s) => s.provincesImageB64)
  const provinces         = useMapDataStore((s) => s.provinces)
  const terrains          = useMapDataStore((s) => s.terrains)
  const continents        = useMapDataStore((s) => s.continents)
  const displayModeOverrides = useDisplayModeConfigStore((s) => s.overrides)
  const displayMode = useCoreSelector(selectDisplayMode)
  const selectedProvinceId = useCoreSelector(selectSelectedProvinceId)

  const src = provincesImageB64 ? `data:image/bmp;base64,${provincesImageB64}` : null
  const displayModeContext = useMemo(() => ({ terrains, continents }), [terrains, continents])

  const highlightColor = useCoreSelector((state) => selectHighlightColor(state, provinces))
  const colorMap = useCoreSelector((state) => selectColorMap(state, provinces, displayModeOverrides, displayModeContext))
  const modeValuesByMode = useMemo(
    () => selectModeValuesByMode(provinces, displayModeOverrides, displayModeContext),
    [provinces, displayModeOverrides, displayModeContext]
  )

  const onColorPicked = useCallback((r: number, g: number, b: number) => {
    const province = query.getProvinceByColor(packColor(r, g, b))
    if (province) api.dispatch(mapCommands.selectProvince(province.id))
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
    <div className={styles.root}>
      <div className={styles.viewport}>
        <MapCanvas
          src={src}
          highlightColor={highlightColor}
          colorMap={colorMap}
          onColorPicked={onColorPicked}
          hoverTooltipPosition={hoveredProvince ? { x: hoveredProvince.x, y: hoveredProvince.y } : null}
          hoverTooltip={resolvedHoverTooltip}
          onHoverColorChange={onHoverColorChange}
        />
      </div>
      <div className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <MapModePanel
            mode={displayMode}
            onModeChange={(mode) => api.dispatch(mapCommands.setDisplayMode(mode))}
            valuesByMode={modeValuesByMode}
          />
        </div>
        <Divider style={{ flexGrow: 0 }} />
        <ProvinceList
          provinces={provinces}
          selectedId={selectedProvinceId}
          onSelect={(provinceId) => api.dispatch(mapCommands.selectProvince(provinceId))}
        />
      </div>
    </div>
  )
}
