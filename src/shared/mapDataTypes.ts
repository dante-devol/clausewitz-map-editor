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
  type: ProvinceType
  isCoastal: boolean
  terrain: string   // TerrainCategory.codeName
  continent: string // Continent.codeName — empty string for provinces with no continent (sea, lake)
}

export interface TerrainCategory {
  codeName: string
  color: Color
  generatedColor: Color
}

export interface Continent {
  codeName: string
  position: number
  color: Color
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if      (h < 60)  { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else              { r = c; g = 0; b = x }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

// Deterministic per-continent color using the golden angle to maximise hue distance.
// Uses the continent's numeric position so order-of-insertion doesn't matter.
export function continentColorFromPosition(position: number): Color {
  const hue = (position * 137.508) % 360
  const { r, g, b } = hslToRgb(hue, 0.62, 0.52)
  return packColor(r, g, b)
}

// Deterministic per-terrain fallback color. Uses a golden-angle hue step to
// keep adjacent terrain categories visually separated without depending on the
// source terrain colors, which are sometimes too similar to compare quickly.
export function terrainGeneratedColorFromIndex(index: number): Color {
  const hue = (index * 137.508) % 360
  const { r, g, b } = hslToRgb(hue, 0.68, 0.5)
  return packColor(r, g, b)
}
