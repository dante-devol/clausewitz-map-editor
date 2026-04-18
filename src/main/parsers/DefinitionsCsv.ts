import { readFileSync } from 'fs'
import { packColor } from '../../shared/mapDataTypes'
import type { Province, ProvinceType, Continent } from '../../shared/mapDataTypes'

const VALID_TYPES = new Set<string>(['land', 'sea', 'lake'])

export class DefinitionsCsv {
  private readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  load(continents: Continent[]): Province[] {
    const content = readFileSync(this.filePath, 'utf-8')
    return DefinitionsCsv.parse(content, continents)
  }

  static parse(content: string, continents: Continent[]): Province[] {
    const continentById = new Map(continents.map((c) => [c.position, c.codeName]))
    const provinces: Province[] = []

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const parts = trimmed.split(';')
      if (parts.length < 8) continue

      const id = parseInt(parts[0])
      if (isNaN(id)) continue

      const r = parseInt(parts[1])
      const g = parseInt(parts[2])
      const b = parseInt(parts[3])
      const rawType = parts[4].trim().toLowerCase()
      const isCoastal = parts[5].trim().toLowerCase() === 'true'
      const terrain = parts[6].trim()
      const continentPosition = parseInt(parts[7])

      const type: ProvinceType = VALID_TYPES.has(rawType) ? (rawType as ProvinceType) : 'land'
      const continent = continentById.get(continentPosition) ?? ''

      provinces.push({ id, color: packColor(r, g, b), type, isCoastal, terrain, continent })
    }

    return provinces
  }
}
