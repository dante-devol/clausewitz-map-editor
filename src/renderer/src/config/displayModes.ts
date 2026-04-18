export type DisplayMode = 'provinces' | 'type' | 'terrain' | 'terrainGenerated' | 'coastal' | 'continent'

export const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  provinces: 'Provinces',
  type:      'Type',
  terrain:   'Terrain',
  terrainGenerated: 'Terrain (False Color)',
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

export function hexToPackedColor(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}
