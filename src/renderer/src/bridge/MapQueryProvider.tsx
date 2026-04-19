import { createContext, useContext, useMemo } from 'react'
import type { Continent, Province, TerrainCategory } from '../../../../shared/mapDataTypes'
import type { ProvinceDraftTarget } from '../../../../shared/provinceEditing'
import { useMapDataStore } from '../infra/store/mapDataStore'
import { selectProvinceDraftTargetMaps } from '../infra/store/provinceEditSelectors'

export interface MapQueryApi {
  getProvinceById(id: number): Province | undefined
  getProvinceByColor(color: number): Province | undefined
  getDraftProvinceById(id: number): ProvinceDraftTarget | undefined
  getDraftProvinceByGuid(guid: string): ProvinceDraftTarget | undefined
  getDraftProvinceByColor(color: number): ProvinceDraftTarget | undefined
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
    getDraftProvinceById(id) {
      return selectDraftTargetMaps().byProvinceId.get(id)
    },
    getDraftProvinceByGuid(guid) {
      return selectDraftTargetMaps().byBmpGuid.get(guid)
    },
    getDraftProvinceByColor(color) {
      return selectDraftTargetMaps().byColor.get(color)
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

function selectDraftTargetMaps() {
  const state = useMapDataStore.getState()
  return selectProvinceDraftTargetMaps(
    state.originalDefinitions,
    state.pendingEdits,
    state.pendingBmpOnlyEdits,
    state.bmpReplacements,
    state.pendingNewProvinces,
    state.bmpOnlyEntries
  )
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
