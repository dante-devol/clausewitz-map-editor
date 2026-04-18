import {
  makeStyles,
  tokens,
  Text,
  Switch,
  Button,
  Divider,
  Badge
} from '@fluentui/react-components'
import type { MapLayer, LayerId } from '../store/mapLayersStore'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    minWidth: '220px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS
  },
  layerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: tokens.spacingHorizontalXS
  }
})

interface MapLayerPanelProps {
  layers: MapLayer[]
  visibleCount: number
  allVisible: boolean
  noneVisible: boolean
  onToggleLayer: (id: LayerId) => void
  onShowAll: () => void
  onHideAll: () => void
}

export function MapLayerPanel({
  layers,
  visibleCount,
  allVisible,
  noneVisible,
  onToggleLayer,
  onShowAll,
  onHideAll
}: MapLayerPanelProps) {
  const styles = useStyles()

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Text weight="semibold">Layers</Text>
          <Badge appearance="filled" color="informative">{visibleCount}</Badge>
        </div>
        <div className={styles.actions}>
          <Button size="small" appearance="subtle" disabled={allVisible} onClick={onShowAll}>
            All
          </Button>
          <Button size="small" appearance="subtle" disabled={noneVisible} onClick={onHideAll}>
            None
          </Button>
        </div>
      </div>

      <Divider />

      {layers.map((layer) => (
        <div key={layer.id} className={styles.layerRow}>
          <Text size={300}>{layer.label}</Text>
          <Switch
            checked={layer.visible}
            onChange={() => onToggleLayer(layer.id)}
          />
        </div>
      ))}
    </div>
  )
}
