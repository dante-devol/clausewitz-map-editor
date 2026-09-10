import { readFileSync } from 'fs'
import { packColor } from '../../shared/mapDataTypes'
import type { TerrainCategory } from '../../shared/mapDataTypes'
import { assignmentsOf, bareNumbers, blockOf, findAssignmentDeep, firstAssignment, parseScript } from './script/ScriptParser'

export class TerrainTxt {
  private readonly filePaths: string[]

  constructor(filePaths: string[]) {
    this.filePaths = filePaths
  }

  load(): TerrainCategory[] {
    const results: TerrainCategory[] = []
    for (const filePath of this.filePaths) {
      const content = readFileSync(filePath, 'utf-8')
      results.push(...TerrainTxt.parse(content))
    }
    return results
  }

  static parse(content: string): TerrainCategory[] {
    const categories = blockOf(findAssignmentDeep(parseScript(content).root, 'categories'))
    if (!categories) return []

    const results: TerrainCategory[] = []
    for (const entry of assignmentsOf(categories)) {
      const category = blockOf(entry)
      const colorBlock = category ? blockOf(firstAssignment(category, 'color')) : undefined
      const rgb = colorBlock ? bareNumbers(colorBlock) : []
      if (rgb.length < 3) continue
      results.push({ codeName: entry.key.text, color: packColor(rgb[0], rgb[1], rgb[2]) })
    }
    return results
  }
}
