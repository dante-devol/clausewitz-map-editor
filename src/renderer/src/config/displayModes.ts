import { packColor } from '../../../shared/mapDataTypes'

export type DisplayMode = 'provinces' | 'type' | 'terrain' | 'coastal' | 'continent'

export const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  provinces: 'Provinces',
  type:      'Type',
  terrain:   'Terrain',
  coastal:   'Coastal',
  continent: 'Continent',
}

// Colors for ProvinceType values. Edit these hex strings to change mode colors.
export const TYPE_COLORS: Record<string, string> = {
  land:  '#5a7c52',
  sea:   '#1a4a7a',
  lake:  '#2d7fa8',
}

// Colors for coastal / inland distinction.
export const COASTAL_COLORS: Record<string, string> = {
  coastal: '#d4a847',
  inland:  '#7a6e58',
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
export function continentColor(position: number): number {
  const hue = (position * 137.508) % 360
  const { r, g, b } = hslToRgb(hue, 0.62, 0.52)
  return packColor(r, g, b)
}

export function hexToPackedColor(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}
