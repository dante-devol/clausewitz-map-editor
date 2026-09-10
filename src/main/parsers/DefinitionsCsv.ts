import { readFileSync } from 'fs'
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

  static parse(content: string, continents: Continent[]): Province[] {
    const continentById = new Map(continents.map((c) => [c.position, c.codeName]))
    const provinces: Province[] = []
    for (const line of content.split(/\r?\n/)) {
      const province = parseLine(line, continentById)
      if (province) provinces.push(province)
    }
    return provinces
  }

  // Produces the new file text from the existing text and the full province
  // list. Lines for provinces whose values didn't change are kept verbatim, as
  // are comments and lines that aren't province rows; changed provinces are
  // rewritten in place and new provinces are appended in ID order. Line endings
  // and the trailing newline follow the existing file.
  static merge(existing: string, provinces: readonly Province[], continents: Continent[]): string {
    const lineEnding = DefinitionsCsv.detectLineEnding(existing)
    const hasTrailingNewline = /\n$/.test(existing)
    const lines = existing.split(/\r?\n/)
    if (hasTrailingNewline) lines.pop()

    const continentById = new Map(continents.map((c) => [c.position, c.codeName]))
    const continentPositionByCodeName = new Map(continents.map((c) => [c.codeName, c.position]))
    const provincesById = new Map(provinces.map((p) => [p.id, p]))

    // The loaded model keeps the last line for a duplicated ID, so that is the
    // line that represents the province; earlier duplicates are left alone.
    const parsedLines = lines.map((line) => parseLine(line, continentById))
    const lastLineById = new Map<number, number>()
    parsedLines.forEach((parsed, index) => { if (parsed) lastLineById.set(parsed.id, index) })

    const written = new Set<number>()
    const out: string[] = []
    lines.forEach((line, index) => {
      const parsed = parsedLines[index]
      if (!parsed || lastLineById.get(parsed.id) !== index) {
        out.push(line)
        return
      }
      const next = provincesById.get(parsed.id)
      if (!next) return // province removed
      written.add(parsed.id)
      out.push(sameProvince(parsed, next) ? line : serializeLine(next, continentPositionByCodeName))
    })

    const added = provinces.filter((p) => !written.has(p.id)).sort((a, b) => a.id - b.id)
    for (const province of added) out.push(serializeLine(province, continentPositionByCodeName))

    return out.join(lineEnding) + (hasTrailingNewline ? lineEnding : '')
  }

  static serialize(provinces: Province[], continents: Continent[], lineEnding = '\n'): string {
    const continentPositionByCodeName = new Map(continents.map((c) => [c.codeName, c.position]))
    return [...provinces]
      .sort((a, b) => a.id - b.id)
      .map((province) => serializeLine(province, continentPositionByCodeName))
      .join(lineEnding)
  }

  static detectLineEnding(content: string): '\r\n' | '\n' {
    const match = content.match(/\r\n|\n/)
    return match?.[0] === '\r\n' ? '\r\n' : '\n'
  }
}

function parseLine(line: string, continentById: Map<number, string>): Province | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  const parts = trimmed.split(';')
  if (parts.length < 8) return null

  const id = parseInt(parts[0])
  if (isNaN(id)) return null

  const rawType = parts[4].trim().toLowerCase()
  const rawIsCoastal = parts[5].trim().toLowerCase()
  const type: ProvinceType | undefined = VALID_TYPES.has(rawType) ? (rawType as ProvinceType) : undefined
  const isCoastal = rawIsCoastal === 'true' ? true : rawIsCoastal === 'false' ? false : undefined

  return {
    id,
    color: packColor(parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3])),
    type,
    isCoastal,
    terrain: parts[6].trim() || undefined,
    continent: continentById.get(parseInt(parts[7]))
  }
}

function serializeLine(province: Province, continentPositionByCodeName: Map<string, number>): string {
  const { r, g, b } = unpackColor(province.color)
  const continentPosition = province.continent ? (continentPositionByCodeName.get(province.continent) ?? 0) : 0
  return [
    province.id,
    r,
    g,
    b,
    province.type ?? 'sea',
    province.isCoastal === true ? 'true' : 'false',
    province.terrain ?? 'unknown',
    continentPosition
  ].join(';')
}

function sameProvince(a: Province, b: Province): boolean {
  return a.color === b.color
    && a.type === b.type
    && a.isCoastal === b.isCoastal
    && a.terrain === b.terrain
    && (a.continent || undefined) === (b.continent || undefined)
}
