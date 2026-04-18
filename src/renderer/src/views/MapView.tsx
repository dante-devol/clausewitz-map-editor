import { makeStyles, tokens } from '@fluentui/react-components'
import { MapLayerPanel } from '../components/MapLayerPanel'
import { MapCanvas } from '../components/MapCanvas'
import { useMapLayers } from '../hooks/useMapLayers'
import { useMapDataStore } from '../store/mapDataStore'

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
    padding: tokens.spacingVerticalM,
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`
  }
})

export function MapView() {
  const styles = useStyles()
  const layers = useMapLayers()
  const provincesImageB64 = useMapDataStore((s) => s.provincesImageB64)
  const src = provincesImageB64 ? `data:image/bmp;base64,${provincesImageB64}` : null

  return (
    <div className={styles.root}>
      <div className={styles.viewport}>
        <MapCanvas src={src} />
      </div>
      <div className={styles.sidebar}>
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
    </div>
  )
}
