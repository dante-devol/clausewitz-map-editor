import { readFileSync } from 'fs'
import { assignmentsOf, blockOf, findAssignmentDeep, parseScript } from './script/ScriptParser'

export class WeatherTxt {
  static load(filePath: string): string[] {
    try {
      const content = readFileSync(filePath, 'utf-8')
      return WeatherTxt.parse(content)
    } catch {
      return []
    }
  }

  // Names of the `terrain_modifiers = { name = { ... } }` entries.
  static parse(content: string): string[] {
    const modifiers = blockOf(findAssignmentDeep(parseScript(content).root, 'terrain_modifiers'))
    if (!modifiers) return []
    return assignmentsOf(modifiers)
      .filter((entry) => entry.value.kind === 'block')
      .map((entry) => entry.key.text)
  }
}
