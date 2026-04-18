import { createContext, useContext, useMemo } from 'react'
import type { Continent, Province, TerrainCategory } from '../../../../shared/mapDataTypes'
import { useMapDataStore } from '../infra/store/mapDataStore'

export interface MapQueryApi {
  getProvinceById(id: number): Province | undefined
  getProvinceByColor(color: number): Province | undefined
  getTerrain(codeName: string): TerrainCategory | undefined
  getContinent(codeName: string): Continent | undefined
  getProvinces(): ReadonlyMap<number, Province>
  getProvincesByColor(): ReadonlyMap<number, number>
  getTerrains(): ReadonlyMap<string, TerrainCategory>
  getContinents(): ReadonlyMap<string, Continent>
}

const MapQueryContext = createContext<MapQueryApi | null>(null)

function createMapQueryApi(): MapQueryApi {
  return {
    getProvinceById(id) {
      return useMapDataStore.getState().provinces.get(id)
    },
    getProvinceByColor(color) {
      const { provincesByColor, provinces } = useMapDataStore.getState()
      const id = provincesByColor.get(color)
      return id === undefined ? undefined : provinces.get(id)
    },
    getTerrain(codeName) {
      return useMapDataStore.getState().terrains.get(codeName)
    },
    getContinent(codeName) {
      return useMapDataStore.getState().continents.get(codeName)
    },
    getProvinces() {
      return useMapDataStore.getState().provinces
    },
    getProvincesByColor() {
      return useMapDataStore.getState().provincesByColor
    },
    getTerrains() {
      return useMapDataStore.getState().terrains
    },
    getContinents() {
      return useMapDataStore.getState().continents
    }
  }
}

export function MapQueryProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const api = useMemo(() => createMapQueryApi(), [])
  return (
    <MapQueryContext.Provider value={api}>
      {children}
    </MapQueryContext.Provider>
  )
}

export function useMapQueryApi(): MapQueryApi {
  const api = useContext(MapQueryContext)
  if (!api) throw new Error('MapQueryProvider is missing')
  return api
}
