import type { Continent, Province, TerrainCategory } from '../../../../shared/mapDataTypes'
import type { DisplayModeOverrides } from '../store/displayModeConfigStore'

export type DisplayMode =
  | 'provinces'
  | 'type'
  | 'terrain'
  | 'coastal'
  | 'continent'
  | 'state'
  | 'strategicRegion'
export type ConfigurableDisplayMode = Exclude<DisplayMode, 'provinces' | 'state' | 'strategicRegion'>

export interface DisplayModeValueDescriptor {
  key: string
  color: number
  isOverride: boolean
}

export interface DisplayModeContext {
  terrains: ReadonlyMap<string, TerrainCategory>
  continents: ReadonlyMap<string, Continent>
  stateProvinceToStateId: ReadonlyMap<number, number>
  strategicRegionProvinceToRegionId: ReadonlyMap<number, number>
}

export const DISPLAY_MODES: DisplayMode[] = [
  'provinces',
  'type',
  'terrain',
  'coastal',
  'continent',
  'state',
  'strategicRegion'
]

export const TYPE_COLORS: Record<string, string> = {
  land: '#5a7c52',
  sea: '#1a4a7a',
  lake: '#2d7fa8',
}

export const COASTAL_COLORS: Record<string, string> = {
  coastal: '#d4a847',
  inland: '#7a6e58',
}

export function hexToPackedColor(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}

export function packedColorToHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

export function continentColor(position: number): number {
  const hue = (position * 137.508) % 360
  const { r, g, b } = hslToRgb(hue, 0.62, 0.52)
  return (r << 16) | (g << 8) | b
}

export function isConfigurableDisplayMode(mode: DisplayMode): mode is ConfigurableDisplayMode {
  return mode === 'type' || mode === 'terrain' || mode === 'coastal' || mode === 'continent'
}

function hashedGroupColor(id: number, variant: 'state' | 'strategicRegion'): number {
  const prime = variant === 'state' ? 1103515245 : 214013
  const offset = variant === 'state' ? 12345 : 2531011
  const seed = Math.abs((id * prime + offset) >>> 0)
  const hue = (seed % 360 + (variant === 'state' ? 0 : 23)) % 360
  const saturation = variant === 'state'
    ? 0.54 + ((seed >> 9) % 18) / 100
    : 0.66 + ((seed >> 9) % 12) / 100
  const lightness = variant === 'state'
    ? 0.44 + ((seed >> 17) % 12) / 100
    : 0.50 + ((seed >> 17) % 10) / 100
  const { r, g, b } = hslToRgb(hue, saturation, lightness)
  return (r << 16) | (g << 8) | b
}

export function getModeValueKey(mode: DisplayMode, province: Province, context: DisplayModeContext): string | null {
  if (mode === 'provinces') return null
  if (mode === 'type') return province.type ?? 'none'
  if (mode === 'terrain') return province.terrain ?? 'none'
  if (mode === 'coastal') return province.isCoastal === undefined ? 'none' : province.isCoastal ? 'coastal' : 'inland'
  if (mode === 'continent') return province.continent || 'none'
  if (mode === 'state') return context.stateProvinceToStateId.get(province.id)?.toString() ?? 'none'
  return context.strategicRegionProvinceToRegionId.get(province.id)?.toString() ?? 'none'
}

export function getModeValueLabel(mode: DisplayMode, valueKey: string): string {
  return valueKey
}

export function getModeValueColor(mode: DisplayMode, valueKey: string, context: DisplayModeContext): number {
  if (mode === 'type') {
    return hexToPackedColor(TYPE_COLORS[valueKey] ?? '#808080')
  }
  if (mode === 'terrain') {
    return context.terrains.get(valueKey)?.color ?? 0x606060
  }
  if (mode === 'coastal') {
    return hexToPackedColor(COASTAL_COLORS[valueKey] ?? '#808080')
  }
  if (mode === 'continent') {
    return valueKey === 'none'
      ? 0x303030
      : continentColor(context.continents.get(valueKey)?.position ?? 0)
  }
  if (mode === 'state') {
    return valueKey === 'none' ? 0x303030 : hashedGroupColor(parseInt(valueKey, 10) || 0, 'state')
  }
  if (mode === 'strategicRegion') {
    return valueKey === 'none' ? 0x303030 : hashedGroupColor(parseInt(valueKey, 10) || 0, 'strategicRegion')
  }
  return 0
}

export function getResolvedModeValueColor(
  mode: DisplayMode,
  valueKey: string,
  overrides: DisplayModeOverrides,
  context: DisplayModeContext
): number {
  if (isConfigurableDisplayMode(mode)) {
    const override = overrides[mode]?.[valueKey]
    if (override) return hexToPackedColor(override)
  }
  return getModeValueColor(mode, valueKey, context)
}

export function listModeValues(
  mode: DisplayMode,
  provinces: ReadonlyMap<number, Province>,
  overrides: DisplayModeOverrides,
  context: DisplayModeContext
): DisplayModeValueDescriptor[] {
  if (!isConfigurableDisplayMode(mode)) return []

  const keys = new Set<string>()
  for (const province of provinces.values()) {
    const valueKey = getModeValueKey(mode, province, context)
    if (valueKey) keys.add(valueKey)
  }
  for (const valueKey of Object.keys(overrides[mode] ?? {})) {
    keys.add(valueKey)
  }

  return [...keys]
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({
      key,
      color: getResolvedModeValueColor(mode, key, overrides, context),
      isOverride: overrides[mode]?.[key] !== undefined
    }))
}
