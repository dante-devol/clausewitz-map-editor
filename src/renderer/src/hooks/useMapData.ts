import { useMapDataStore } from '../store/mapDataStore'
import type { Province, TerrainCategory, Continent } from '../../../shared/mapDataTypes'

// ─── React hooks (subscribe to store, trigger re-renders) ────────────────────

export function useProvince(id: number): Province | undefined {
  return useMapDataStore((s) => s.provinces.get(id))
}

export function useProvinceByColor(color: number): Province | undefined {
  return useMapDataStore((s) => {
    const id = s.provincesByColor.get(color)
    return id !== undefined ? s.provinces.get(id) : undefined
  })
}

export function useTerrain(codeName: string): TerrainCategory | undefined {
  return useMapDataStore((s) => s.terrains.get(codeName))
}

export function useContinent(codeName: string): Continent | undefined {
  return useMapDataStore((s) => s.continents.get(codeName))
}

// Composite faces — resolve a province's refs in one call

export function useProvinceTerrain(province: Province | undefined): TerrainCategory | undefined {
  return useMapDataStore((s) => (province ? s.terrains.get(province.terrain) : undefined))
}

export function useProvinceContinent(province: Province | undefined): Continent | undefined {
  return useMapDataStore((s) => (province ? s.continents.get(province.continent) : undefined))
}

// ─── Plain accessor (non-React, e.g. parsers, workers, event handlers) ───────

export const mapData = {
  getProvince: (id: number): Province | undefined =>
    useMapDataStore.getState().provinces.get(id),

  getProvinceByColor: (color: number): Province | undefined => {
    const { provincesByColor, provinces } = useMapDataStore.getState()
    const id = provincesByColor.get(color)
    return id !== undefined ? provinces.get(id) : undefined
  },

  getTerrain: (codeName: string): TerrainCategory | undefined =>
    useMapDataStore.getState().terrains.get(codeName),

  getContinent: (codeName: string): Continent | undefined =>
    useMapDataStore.getState().continents.get(codeName),

  getProvinceTerrain: (province: Province): TerrainCategory | undefined =>
    useMapDataStore.getState().terrains.get(province.terrain),

  getProvinceContinent: (province: Province): Continent | undefined =>
    useMapDataStore.getState().continents.get(province.continent)
}
