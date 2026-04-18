import { useMemo, useCallback, useState } from 'react'
import { makeStyles, tokens, Divider } from '@fluentui/react-components'
import { MapModePanel } from '../components/MapModePanel'
import { MapCanvas } from '../components/MapCanvas'
import { ProvinceList } from '../components/ProvinceList'
import { useI18n } from '../i18n/I18nProvider'
import { useMapDataStore } from '../store/mapDataStore'
import { useDisplayModeConfigStore } from '../store/displayModeConfigStore'
import { packColor, type Province } from '../../../shared/mapDataTypes'
import {
  type ConfigurableDisplayMode,
  type DisplayMode,
  getModeValueKey,
  getResolvedModeValueColor,
  listModeValues,
} from '../config/displayModes'
import type { MessageKey } from '../i18n/messages/en'

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

function getModeValueDisplay(mode: DisplayMode, value: string): string {
  if (mode === 'coastal' && value === 'coastal') return 'mapValue.coastal'
  if (mode === 'coastal' && value === 'inland') return 'mapValue.inland'
  if (mode === 'continent' && value === 'none') return 'mapValue.none'
  return value
}

function getHoverTooltip(
  displayMode: DisplayMode,
  province: Province,
  t: (key: MessageKey) => string
): { label: string; value: string } {
  if (displayMode === 'provinces') {
    return { label: t('map.hover.provinceId'), value: province.id.toString() }
  }
  if (displayMode === 'type') {
    return { label: t('map.hover.type'), value: province.type }
  }
  if (displayMode === 'terrain') {
    return { label: t('map.hover.terrain'), value: province.terrain }
  }
  if (displayMode === 'coastal') {
    return {
      label: t('map.hover.coastal'),
      value: t(getModeValueDisplay(displayMode, province.isCoastal ? 'coastal' : 'inland') as MessageKey)
    }
  }
  const continent = province.continent || 'none'
  return {
    label: t('map.hover.continent'),
    value: continent === 'none' ? t('mapValue.none') : continent
  }
}

export function MapView() {
  const styles = useStyles()
  const { t } = useI18n()
  const [displayMode, setDisplayMode] = useState<DisplayMode>('provinces')
  const [hoveredProvince, setHoveredProvince] = useState<HoveredProvince | null>(null)

  const provincesImageB64 = useMapDataStore((s) => s.provincesImageB64)
  const provinces         = useMapDataStore((s) => s.provinces)
  const provincesByColor  = useMapDataStore((s) => s.provincesByColor)
  const terrains          = useMapDataStore((s) => s.terrains)
  const continents        = useMapDataStore((s) => s.continents)
  const selectedProvinceId = useMapDataStore((s) => s.selectedProvinceId)
  const setSelectedProvince = useMapDataStore((s) => s.setSelectedProvince)
  const displayModeOverrides = useDisplayModeConfigStore((s) => s.overrides)

  const src = provincesImageB64 ? `data:image/bmp;base64,${provincesImageB64}` : null
  const displayModeContext = useMemo(() => ({ terrains, continents }), [terrains, continents])

  const highlightColor = selectedProvinceId !== null
    ? (provinces.get(selectedProvinceId)?.color ?? null)
    : null

  const colorMap = useMemo((): Map<number, number> | null => {
    if (displayMode === 'provinces' || provinces.size === 0) return null

    const map = new Map<number, number>()
    for (const p of provinces.values()) {
      const valueKey = getModeValueKey(displayMode, p)
      if (!valueKey) continue
      map.set(p.color, getResolvedModeValueColor(displayMode, valueKey, displayModeOverrides, displayModeContext))
    }

    return map
  }, [displayMode, provinces, displayModeOverrides, displayModeContext])

  const modeValuesByMode = useMemo(() => {
    const configurableModes: ConfigurableDisplayMode[] = ['type', 'terrain', 'coastal', 'continent']
    return configurableModes.reduce<Partial<Record<ConfigurableDisplayMode, ReturnType<typeof listModeValues>>>>(
      (acc, currentMode) => {
        acc[currentMode] = listModeValues(currentMode, provinces, displayModeOverrides, displayModeContext)
        return acc
      },
      {}
    )
  }, [provinces, displayModeOverrides, displayModeContext])

  const onColorPicked = useCallback((r: number, g: number, b: number) => {
    const id = provincesByColor.get(packColor(r, g, b))
    if (id !== undefined) setSelectedProvince(id)
  }, [provincesByColor, setSelectedProvince])

  const onHoverColorChange = useCallback((color: { r: number; g: number; b: number; x: number; y: number } | null) => {
    if (!color) {
      setHoveredProvince(null)
      return
    }
    const id = provincesByColor.get(packColor(color.r, color.g, color.b))
    if (id === undefined) {
      setHoveredProvince(null)
      return
    }
    setHoveredProvince({ id, x: color.x, y: color.y })
  }, [provincesByColor])

  const hoverTooltip = useMemo(() => {
    if (!hoveredProvince) return null
    const province = provinces.get(hoveredProvince.id)
    if (!province) return null
    return getHoverTooltip(displayMode, province, t)
  }, [displayMode, hoveredProvince, provinces, t])

  return (
    <div className={styles.root}>
      <div className={styles.viewport}>
        <MapCanvas
          src={src}
          highlightColor={highlightColor}
          colorMap={colorMap}
          onColorPicked={onColorPicked}
          hoverTooltipPosition={hoveredProvince ? { x: hoveredProvince.x, y: hoveredProvince.y } : null}
          hoverTooltip={hoverTooltip}
          onHoverColorChange={onHoverColorChange}
        />
      </div>
      <div className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <MapModePanel mode={displayMode} onModeChange={setDisplayMode} valuesByMode={modeValuesByMode} />
        </div>
        <Divider style={{ flexGrow: 0 }} />
        <ProvinceList
          provinces={provinces}
          selectedId={selectedProvinceId}
          onSelect={setSelectedProvince}
        />
      </div>
    </div>
  )
}
