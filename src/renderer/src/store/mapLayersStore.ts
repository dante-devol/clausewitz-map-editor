import { create } from 'zustand'

export type LayerId = 'terrain' | 'rivers' | 'political' | 'states'

export interface MapLayer {
  id: LayerId
  label: string
  visible: boolean
}

interface MapLayersState {
  layers: MapLayer[]
  toggleLayer: (id: LayerId) => void
  setAllVisible: (visible: boolean) => void
}

const DEFAULT_LAYERS: MapLayer[] = [
  { id: 'terrain',   label: 'Terrain',   visible: true  },
  { id: 'rivers',    label: 'Rivers',    visible: true  },
  { id: 'political', label: 'Political', visible: false },
  { id: 'states',    label: 'States',    visible: false }
]

export const useMapLayersStore = create<MapLayersState>((set) => ({
  layers: DEFAULT_LAYERS,
  toggleLayer: (id) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    })),
  setAllVisible: (visible) =>
    set((s) => ({ layers: s.layers.map((l) => ({ ...l, visible })) }))
}))
