import { useMemo, useCallback, useState } from 'react'
import { makeStyles, tokens, Divider } from '@fluentui/react-components'
import { MapModePanel } from '../components/MapModePanel'
import { MapCanvas } from '../components/MapCanvas'
import { ProvinceList } from '../components/ProvinceList'
import { useMapDataStore } from '../store/mapDataStore'
import { packColor } from '../../../shared/mapDataTypes'
import {
  type DisplayMode,
  TYPE_COLORS,
  COASTAL_COLORS,
  continentColor,
  hexToPackedColor,
} from '../config/displayModes'

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

export function MapView() {
  const styles = useStyles()
  const [displayMode, setDisplayMode] = useState<DisplayMode>('provinces')

  const provincesImageB64 = useMapDataStore((s) => s.provincesImageB64)
  const provinces         = useMapDataStore((s) => s.provinces)
  const provincesByColor  = useMapDataStore((s) => s.provincesByColor)
  const terrains          = useMapDataStore((s) => s.terrains)
  const continents        = useMapDataStore((s) => s.continents)
  const selectedProvinceId = useMapDataStore((s) => s.selectedProvinceId)
  const setSelectedProvince = useMapDataStore((s) => s.setSelectedProvince)

  const src = provincesImageB64 ? `data:image/bmp;base64,${provincesImageB64}` : null

  const sortedProvinces = useMemo(
    () => [...provinces.values()].sort((a, b) => a.id - b.id),
    [provinces]
  )

  const highlightColor = selectedProvinceId !== null
    ? (provinces.get(selectedProvinceId)?.color ?? null)
    : null

  const colorMap = useMemo((): Map<number, number> | null => {
    if (displayMode === 'provinces' || provinces.size === 0) return null

    const map = new Map<number, number>()

    if (displayMode === 'type') {
      for (const p of provinces.values()) {
        map.set(p.color, hexToPackedColor(TYPE_COLORS[p.type] ?? '#808080'))
      }
    } else if (displayMode === 'terrain') {
      for (const p of provinces.values()) {
        map.set(p.color, terrains.get(p.terrain)?.color ?? 0x606060)
      }
    } else if (displayMode === 'coastal') {
      for (const p of provinces.values()) {
        const hex = p.isCoastal ? COASTAL_COLORS.coastal : COASTAL_COLORS.inland
        map.set(p.color, hexToPackedColor(hex))
      }
    } else if (displayMode === 'continent') {
      for (const p of provinces.values()) {
        const continent = continents.get(p.continent)
        map.set(p.color, continent ? continentColor(continent.position) : 0x303030)
      }
    }

    return map
  }, [displayMode, provinces, terrains, continents])

  const onColorPicked = useCallback((r: number, g: number, b: number) => {
    const id = provincesByColor.get(packColor(r, g, b))
    if (id !== undefined) setSelectedProvince(id)
  }, [provincesByColor, setSelectedProvince])

  return (
    <div className={styles.root}>
      <div className={styles.viewport}>
        <MapCanvas
          src={src}
          highlightColor={highlightColor}
          colorMap={colorMap}
          onColorPicked={onColorPicked}
        />
      </div>
      <div className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <MapModePanel mode={displayMode} onModeChange={setDisplayMode} />
        </div>
        <Divider style={{ flexGrow: 0 }} />
        <ProvinceList
          provinces={sortedProvinces}
          selectedId={selectedProvinceId}
          onSelect={setSelectedProvince}
        />
      </div>
    </div>
  )
}
