import { makeStyles, tokens, Text } from '@fluentui/react-components'
import { MapLayerPanel } from '../components/MapLayerPanel'
import { useMapLayers } from '../hooks/useMapLayers'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100%'
  },
  canvas: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3
  },
  sidebar: {
    padding: tokens.spacingVerticalM,
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`
  }
})

export function MapView() {
  const styles = useStyles()
  const layers = useMapLayers()

  return (
    <div className={styles.root}>
      <div className={styles.canvas}>
        <Text size={400}>Map viewport — {layers.visibleCount} layer(s) visible</Text>
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
