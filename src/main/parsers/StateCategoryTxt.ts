import { readFileSync } from 'fs'
import { packColor } from '../../shared/mapDataTypes'
import type { StateCategory } from '../../shared/mapDataTypes'

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
    const results: StateCategory[] = []

    const catIdx = content.search(/\bstate_categories\s*=\s*\{/)
    if (catIdx === -1) return results

    const catOpen = content.indexOf('{', catIdx)
    const catBlock = extractBlock(content, catOpen)
    if (!catBlock) return results

    for (const { name, content: blockContent } of parseNamedBlocks(catBlock.content)) {
      const slotsMatch = blockContent.match(/\blocal_building_slots\s*=\s*(\d+)\b/)
      const colorMatch = blockContent.match(/\bcolor\s*=\s*\{\s*(\d+)\s+(\d+)\s+(\d+)\s*\}/)
      if (!slotsMatch || !colorMatch) continue

      results.push({
        codeName: name,
        localBuildingSlots: parseInt(slotsMatch[1]),
        color: packColor(parseInt(colorMatch[1]), parseInt(colorMatch[2]), parseInt(colorMatch[3]))
      })
    }

    return results
  }
}

interface Block { content: string; end: number }

function extractBlock(str: string, openIdx: number): Block | null {
  let depth = 0
  for (let i = openIdx; i < str.length; i++) {
    if (str[i] === '{') depth++
    else if (str[i] === '}') {
      if (--depth === 0) return { content: str.slice(openIdx + 1, i), end: i + 1 }
    }
  }
  return null
}

function parseNamedBlocks(content: string): Array<{ name: string; content: string }> {
  const results: Array<{ name: string; content: string }> = []
  let i = 0

  while (i < content.length) {
    const c = content[i]

    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue }
    if (c === '#') { while (i < content.length && content[i] !== '\n') i++; continue }

    const nameStart = i
    while (i < content.length && /\w/.test(content[i])) i++
    if (i === nameStart) { i++; continue }
    const name = content.slice(nameStart, i)

    while (i < content.length && (content[i] === ' ' || content[i] === '\t')) i++

    if (content[i] !== '=') {
      while (i < content.length && content[i] !== '\n') i++
      continue
    }
    i++

    while (i < content.length && (content[i] === ' ' || content[i] === '\t')) i++

    if (content[i] !== '{') {
      while (i < content.length && content[i] !== '\n') i++
      continue
    }

    const block = extractBlock(content, i)
    if (!block) break

    results.push({ name, content: block.content })
    i = block.end
  }

  return results
}
