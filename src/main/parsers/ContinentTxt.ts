import { readFileSync } from 'fs'
import type { Continent } from '../../shared/mapDataTypes'

export class ContinentTxt {
  private readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  load(): Continent[] {
    const content = readFileSync(this.filePath, 'utf-8')
    return ContinentTxt.parse(content)
  }

  static parse(content: string): Continent[] {
    const match = content.match(/continents\s*=\s*\{([^}]*)\}/)
    if (!match) return []

    const names = match[1]
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('#'))

    return names.map((codeName, i) => ({
      codeName,
      // HOI4 reserves continent 0 for "none"; named continents start at 1.
      position: i + 1
    }))
  }
}
