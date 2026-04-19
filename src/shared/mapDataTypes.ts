// Packed RGB integer: (r << 16) | (g << 8) | b
// Each channel is 0–255.
export type Color = number

// Same packing as Color, but lives in a separate lookup keyed by province color.
// Keeping it as a distinct type alias makes intent clear at call sites.
export type ProvinceColor = Color

export function packColor(r: number, g: number, b: number): Color {
  return (r << 16) | (g << 8) | b
}

export function unpackColor(color: Color): { r: number; g: number; b: number } {
  return {
    r: (color >> 16) & 0xff,
    g: (color >> 8)  & 0xff,
    b:  color        & 0xff
  }
}

export type ProvinceType = 'land' | 'sea' | 'lake'

export interface Province {
  id: number
  color: ProvinceColor
  type: ProvinceType | undefined
  isCoastal: boolean | undefined
  terrain: string | undefined   // TerrainCategory.codeName
  continent: string | undefined // Continent.codeName — empty string for provinces with no continent (sea, lake)
}

export interface StateDefinition {
  id: number
  provinceIds: number[]
}

export interface StrategicRegionDefinition {
  id: number
  provinceIds: number[]
}

export interface TerrainCategory {
  codeName: string
  color: Color
}

export interface Continent {
  codeName: string
  position: number
}
