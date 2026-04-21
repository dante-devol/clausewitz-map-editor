import { type StateCreator } from 'zustand'
import type { Province, TerrainCategory, Continent } from '../../../../../shared/mapDataTypes'
import type { ProvinceCatalogEntry } from '../../../../../shared/provinceCatalog'

export interface ProvinceDataSlice {
  provinces: Map<number, Province>
  provincesByColor: Map<number, number>
  baseProvinceCatalog: ProvinceCatalogEntry[]
  provinceCatalog: ProvinceCatalogEntry[]
  terrains: Map<string, TerrainCategory>
  continents: Map<string, Continent>
  loadProvinces: (provinces: Province[]) => void
  loadProvinceCatalog: (catalog: ProvinceCatalogEntry[]) => void
  setProvinceCatalog: (catalog: ProvinceCatalogEntry[]) => void
  loadTerrains: (terrains: TerrainCategory[]) => void
  loadContinents: (continents: Continent[]) => void
}

export const PROVINCE_DATA_EMPTY = {
  provinces: new Map<number, Province>(),
  provincesByColor: new Map<number, number>(),
  baseProvinceCatalog: [] as ProvinceCatalogEntry[],
  provinceCatalog: [] as ProvinceCatalogEntry[],
  terrains: new Map<string, TerrainCategory>(),
  continents: new Map<string, Continent>(),
}

export const createProvinceDataSlice: StateCreator<ProvinceDataSlice, [], [], ProvinceDataSlice> = (set) => ({
  ...PROVINCE_DATA_EMPTY,

  loadProvinces: (incoming) => {
    const provinces = new Map<number, Province>()
    const provincesByColor = new Map<number, number>()
    for (const p of incoming) {
      provinces.set(p.id, p)
      provincesByColor.set(p.color, p.id)
    }
    set({ provinces, provincesByColor })
  },

  loadProvinceCatalog: (provinceCatalog) => set({
    baseProvinceCatalog: provinceCatalog,
    provinceCatalog
  }),

  setProvinceCatalog: (provinceCatalog) => set({ provinceCatalog }),

  loadTerrains: (incoming) => {
    const terrains = new Map<string, TerrainCategory>()
    for (const t of incoming) terrains.set(t.codeName, t)
    set({ terrains })
  },

  loadContinents: (incoming) => {
    const continents = new Map<string, Continent>()
    for (const c of incoming) continents.set(c.codeName, c)
    set({ continents })
  },
})
