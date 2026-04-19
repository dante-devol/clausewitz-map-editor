import { readFileSync, writeFileSync } from 'fs'
import { packColor, unpackColor } from '../../shared/mapDataTypes'
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

  save(provinces: Province[], continents: Continent[]): void {
    const existingContent = readFileSync(this.filePath, 'utf-8')
    const lineEnding = DefinitionsCsv.detectLineEnding(existingContent)
    const content = DefinitionsCsv.serialize(provinces, continents, lineEnding)
    writeFileSync(this.filePath, content, 'utf-8')
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

      provinces.push({
        id,
        color: packColor(r, g, b),
        type,
        isCoastal,
        terrain,
        continent
      })
    }

    return provinces
  }

  static serialize(provinces: Province[], continents: Continent[], lineEnding = '\n'): string {
    const continentPositionByCodeName = new Map(continents.map((c) => [c.codeName, c.position]))

    return [...provinces]
      .sort((a, b) => a.id - b.id)
      .map((province) => {
        const { r, g, b } = unpackColor(province.color)
        const continentPosition = province.continent
          ? (continentPositionByCodeName.get(province.continent) ?? 0)
          : 0

        return [
          province.id,
          r,
          g,
          b,
          province.type,
          province.isCoastal ? 'true' : 'false',
          province.terrain,
          continentPosition
        ].join(';')
      })
      .join(lineEnding)
  }

  static detectLineEnding(content: string): '\r\n' | '\n' {
    const match = content.match(/\r\n|\n/)
    return match?.[0] === '\r\n' ? '\r\n' : '\n'
  }
}
