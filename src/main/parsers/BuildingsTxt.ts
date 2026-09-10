import { readFileSync } from 'fs'
import type { Building, LevelCap } from '../../shared/mapDataTypes'
import { assignmentsOf, blockOf, findAssignmentDeep, firstAssignment, numberOf, parseScript, scalarOf, type ScriptBlock } from './script/ScriptParser'

export class BuildingsTxt {
  private readonly filePaths: string[]

  constructor(filePaths: string[]) {
    this.filePaths = filePaths
  }

  load(): Building[] {
    const results: Building[] = []
    for (const filePath of this.filePaths) {
      const content = readFileSync(filePath, 'utf-8')
      results.push(...BuildingsTxt.parse(content))
    }
    return results
  }

  static parse(content: string): Building[] {
    const buildings = blockOf(findAssignmentDeep(parseScript(content).root, 'buildings'))
    if (!buildings) return []

    const results: Building[] = []
    for (const entry of assignmentsOf(buildings)) {
      const building = blockOf(entry)
      const levelCapBlock = building ? blockOf(firstAssignment(building, 'level_cap')) : undefined
      if (!levelCapBlock) continue
      results.push({ codeName: entry.key.text, levelCap: readLevelCap(levelCapBlock) })
    }
    return results
  }
}

function readLevelCap(block: ScriptBlock): LevelCap {
  return {
    sharesSlots: scalarOf(firstAssignment(block, 'shares_slots')) === 'yes',
    provinceMax: numberOf(firstAssignment(block, 'province_max')) ?? undefined,
    stateMax: numberOf(firstAssignment(block, 'state_max')) ?? undefined,
    groupBy: scalarOf(firstAssignment(block, 'group_by')),
    exclusiveWith: scalarOf(firstAssignment(block, 'exclusive_with'))
  }
}
