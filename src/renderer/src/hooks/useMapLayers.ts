import { useMapLayersStore, type MapLayer, type LayerId } from '../store/mapLayersStore'

export interface MapLayersState {
  layers: MapLayer[]
  visibleCount: number
  allVisible: boolean
  noneVisible: boolean
  toggleLayer: (id: LayerId) => void
  showAll: () => void
  hideAll: () => void
}

export function useMapLayers(): MapLayersState {
  const layers = useMapLayersStore((s) => s.layers)
  const toggleLayer = useMapLayersStore((s) => s.toggleLayer)
  const setAllVisible = useMapLayersStore((s) => s.setAllVisible)

  const visibleCount = layers.filter((l) => l.visible).length

  return {
    layers,
    visibleCount,
    allVisible: visibleCount === layers.length,
    noneVisible: visibleCount === 0,
    toggleLayer,
    showAll: () => setAllVisible(true),
    hideAll: () => setAllVisible(false)
  }
}
