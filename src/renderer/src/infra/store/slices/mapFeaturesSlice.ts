import { type StateCreator } from 'zustand'
import type { MapAdjacency, Railway, SupplyNode } from '../../../../../shared/mapDataTypes'

// Read-only map-feature data (adjacencies.csv, railways.txt, supply_nodes.txt)
// loaded on demand once a project is open. No editing yet — see the parsers
// in src/main/parsers for the file formats.
export interface MapFeaturesSlice {
  adjacencies: MapAdjacency[]
  railways: Railway[]
  supplyNodes: SupplyNode[]
  loadMapFeatures: (data: { adjacencies: MapAdjacency[]; railways: Railway[]; supplyNodes: SupplyNode[] }) => void
}

export const MAP_FEATURES_EMPTY = {
  adjacencies: [] as MapAdjacency[],
  railways: [] as Railway[],
  supplyNodes: [] as SupplyNode[],
}

export const createMapFeaturesSlice: StateCreator<MapFeaturesSlice, [], [], MapFeaturesSlice> = (set) => ({
  ...MAP_FEATURES_EMPTY,
  loadMapFeatures: ({ adjacencies, railways, supplyNodes }) => set({ adjacencies, railways, supplyNodes }),
})
