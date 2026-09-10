import { readFileSync } from 'fs'
import type { Continent } from '../../shared/mapDataTypes'
import { bareScalars, blockOf, findAssignmentDeep, parseScript } from './script/ScriptParser'

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
    const continents = blockOf(findAssignmentDeep(parseScript(content).root, 'continents'))
    if (!continents) return []
    // HOI4 reserves continent 0 for "none"; named continents start at 1.
    return bareScalars(continents).map((scalar, i) => ({ codeName: scalar.text, position: i + 1 }))
  }
}
