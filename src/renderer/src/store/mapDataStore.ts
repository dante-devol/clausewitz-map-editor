import { create } from 'zustand'
import type { Province, TerrainCategory, Continent } from '../../../shared/mapDataTypes'

interface MapDataState {
  // Primary lookups
  provinces: Map<number, Province>          // id → Province
  provincesByColor: Map<number, number>     // ProvinceColor → Province id
  terrains: Map<string, TerrainCategory>   // codeName → TerrainCategory
  continents: Map<string, Continent>        // codeName → Continent

  // Raw provinces.bmp image, base64-encoded
  provincesImageB64: string | null

  // Bulk loaders — replace the entire table at once
  loadProvinces: (provinces: Province[]) => void
  loadTerrains: (terrains: TerrainCategory[]) => void
  loadContinents: (continents: Continent[]) => void
  loadProvincesImage: (b64: string) => void
  clear: () => void
}

const EMPTY_STATE = {
  provinces: new Map<number, Province>(),
  provincesByColor: new Map<number, number>(),
  terrains: new Map<string, TerrainCategory>(),
  continents: new Map<string, Continent>(),
  provincesImageB64: null as string | null
}

export const useMapDataStore = create<MapDataState>((set) => ({
  ...EMPTY_STATE,

  loadProvinces: (incoming) => {
    const provinces = new Map<number, Province>()
    const provincesByColor = new Map<number, number>()
    for (const p of incoming) {
      provinces.set(p.id, p)
      provincesByColor.set(p.color, p.id)
    }
    set({ provinces, provincesByColor })
  },

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

  loadProvincesImage: (b64) => set({ provincesImageB64: b64 }),

  clear: () => set({ ...EMPTY_STATE })
}))
