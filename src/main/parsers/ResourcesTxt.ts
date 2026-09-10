import { readFileSync } from 'fs'
import type { Resource } from '../../shared/mapDataTypes'
import { assignmentsOf, blockOf, findAssignmentDeep, parseScript } from './script/ScriptParser'

export class ResourcesTxt {
  private readonly filePaths: string[]

  constructor(filePaths: string[]) {
    this.filePaths = filePaths
  }

  load(): Resource[] {
    const results: Resource[] = []
    for (const filePath of this.filePaths) {
      const content = readFileSync(filePath, 'utf-8')
      results.push(...ResourcesTxt.parse(content))
    }
    return results
  }

  static parse(content: string): Resource[] {
    const resources = blockOf(findAssignmentDeep(parseScript(content).root, 'resources'))
    if (!resources) return []
    return assignmentsOf(resources)
      .filter((entry) => entry.value.kind === 'block')
      .map((entry) => ({ codeName: entry.key.text }))
  }
}
