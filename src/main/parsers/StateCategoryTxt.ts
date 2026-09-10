import { readFileSync } from 'fs'
import { packColor } from '../../shared/mapDataTypes'
import type { StateCategory } from '../../shared/mapDataTypes'
import { assignmentsOf, bareNumbers, blockOf, findAssignmentDeep, firstAssignment, numberOf, parseScript } from './script/ScriptParser'

export class StateCategoryTxt {
  private readonly filePaths: string[]

  constructor(filePaths: string[]) {
    this.filePaths = filePaths
  }

  load(): StateCategory[] {
    const results: StateCategory[] = []
    for (const filePath of this.filePaths) {
      const content = readFileSync(filePath, 'utf-8')
      results.push(...StateCategoryTxt.parse(content))
    }
    return results
  }

  static parse(content: string): StateCategory[] {
    const categories = blockOf(findAssignmentDeep(parseScript(content).root, 'state_categories'))
    if (!categories) return []

    const results: StateCategory[] = []
    for (const entry of assignmentsOf(categories)) {
      const category = blockOf(entry)
      if (!category) continue
      const slots = numberOf(firstAssignment(category, 'local_building_slots'))
      const colorBlock = blockOf(firstAssignment(category, 'color'))
      const rgb = colorBlock ? bareNumbers(colorBlock) : []
      if (slots === null || rgb.length < 3) continue
      results.push({
        codeName: entry.key.text,
        localBuildingSlots: slots,
        color: packColor(rgb[0], rgb[1], rgb[2])
      })
    }
    return results
  }
}
