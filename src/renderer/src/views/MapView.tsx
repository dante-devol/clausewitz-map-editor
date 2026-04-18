import { useMemo, useCallback } from 'react'
import { makeStyles, tokens, Divider } from '@fluentui/react-components'
import { MapLayerPanel } from '../components/MapLayerPanel'
import { MapCanvas } from '../components/MapCanvas'
import { ProvinceList } from '../components/ProvinceList'
import { useMapLayers } from '../hooks/useMapLayers'
import { useMapDataStore } from '../store/mapDataStore'
import { packColor } from '../../../shared/mapDataTypes'

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
  const layers = useMapLayers()

  const provincesImageB64 = useMapDataStore((s) => s.provincesImageB64)
  const provinces = useMapDataStore((s) => s.provinces)
  const provincesByColor = useMapDataStore((s) => s.provincesByColor)
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

  const onColorPicked = useCallback((r: number, g: number, b: number) => {
    const id = provincesByColor.get(packColor(r, g, b))
    if (id !== undefined) setSelectedProvince(id)
  }, [provincesByColor, setSelectedProvince])

  return (
    <div className={styles.root}>
      <div className={styles.viewport}>
        <MapCanvas src={src} highlightColor={highlightColor} onColorPicked={onColorPicked} />
      </div>
      <div className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <MapLayerPanel
            layers={layers.layers}
            visibleCount={layers.visibleCount}
            allVisible={layers.allVisible}
            noneVisible={layers.noneVisible}
            onToggleLayer={layers.toggleLayer}
            onShowAll={layers.showAll}
            onHideAll={layers.hideAll}
          />
        </div>
        <Divider />
        <ProvinceList
          provinces={sortedProvinces}
          selectedId={selectedProvinceId}
          onSelect={setSelectedProvince}
        />
      </div>
    </div>
  )
}
