import type { Province, ProvinceType } from './mapDataTypes'

export type ProvinceCatalogEntryKey = `definition:${number}` | `gap:${number}` | `bmp:${number}`
export type ProvinceCatalogSourceKind = 'definitions' | 'id-gap' | 'bmp-color'
export type ProvinceCatalogMapPresence = 'present' | 'missing' | 'unknown'

export interface ProvinceBitmapFact {
  color: number
  pixelCount: number
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
}

export interface ProvinceBitmapFacts {
  colors: number[]
  byColor: Map<number, ProvinceBitmapFact>
}

export interface ProvinceCatalogEntry {
  key: ProvinceCatalogEntryKey
  id: number | null
  color: number | null
  type: ProvinceType | null
  isCoastal: boolean | null
  terrain: string | null
  continent: string | null
  canonical: boolean
  sources: ProvinceCatalogSourceKind[]
  mapPresence: ProvinceCatalogMapPresence
  definition?: Province
  bitmapFact?: ProvinceBitmapFact
}

export function buildProvinceCatalog(definitions: readonly Province[]): ProvinceCatalogEntry[] {
  if (definitions.length === 0) return []

  const catalog = definitions
    .map<ProvinceCatalogEntry>((province) => ({
      key: `definition:${province.id}`,
      id: province.id,
      color: province.color,
      type: province.type,
      isCoastal: province.isCoastal,
      terrain: province.terrain,
      continent: province.continent,
      canonical: true,
      sources: ['definitions'],
      mapPresence: 'unknown',
      definition: province
    }))
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))

  const gaps: ProvinceCatalogEntry[] = []

  for (let i = 1; i < catalog.length; i++) {
    const previousId = catalog[i - 1].id
    const currentId = catalog[i].id
    if (previousId === null || currentId === null) continue

    for (let missingId = previousId + 1; missingId < currentId; missingId++) {
      gaps.push({
        key: `gap:${missingId}`,
        id: missingId,
        color: null,
        type: null,
        isCoastal: null,
        terrain: null,
        continent: null,
        canonical: false,
        sources: ['id-gap'],
        mapPresence: 'unknown'
      })
    }
  }

  return [...catalog, ...gaps].sort(compareCatalogEntries)
}

export function reconcileProvinceCatalogWithBitmap(
  catalog: readonly ProvinceCatalogEntry[],
  bitmapFacts: ProvinceBitmapFacts
): ProvinceCatalogEntry[] {
  const remainingColors = new Map(bitmapFacts.byColor)

  const reconciled = catalog.map((entry) => {
    if (entry.color === null) return entry

    const bitmapFact = remainingColors.get(entry.color)
    if (!bitmapFact) {
      return { ...entry, mapPresence: 'missing' }
    }

    remainingColors.delete(entry.color)
    return {
      ...entry,
      mapPresence: 'present',
      bitmapFact
    }
  })

  for (const bitmapFact of remainingColors.values()) {
    reconciled.push({
      key: `bmp:${bitmapFact.color}`,
      id: null,
      color: bitmapFact.color,
      type: null,
      isCoastal: null,
      terrain: null,
      continent: null,
      canonical: false,
      sources: ['bmp-color'],
      mapPresence: 'present',
      bitmapFact
    })
  }

  return reconciled.sort(compareCatalogEntries)
}

function compareCatalogEntries(a: ProvinceCatalogEntry, b: ProvinceCatalogEntry): number {
  const aId = a.id ?? Number.MAX_SAFE_INTEGER
  const bId = b.id ?? Number.MAX_SAFE_INTEGER
  if (aId !== bId) return aId - bId

  const aColor = a.color ?? Number.MAX_SAFE_INTEGER
  const bColor = b.color ?? Number.MAX_SAFE_INTEGER
  if (aColor !== bColor) return aColor - bColor

  return a.key.localeCompare(b.key)
}
