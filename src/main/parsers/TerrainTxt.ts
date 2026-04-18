import { readFileSync } from 'fs'
import { packColor, terrainGeneratedColorFromIndex } from '../../shared/mapDataTypes'
import type { TerrainCategory } from '../../shared/mapDataTypes'

export class TerrainTxt {
  private readonly filePaths: string[]

  constructor(filePaths: string[]) {
    this.filePaths = filePaths
  }

  load(): TerrainCategory[] {
    const results: TerrainCategory[] = []
    let terrainIndex = 0
    for (const filePath of this.filePaths) {
      const content = readFileSync(filePath, 'utf-8')
      const parsed = TerrainTxt.parse(content, terrainIndex)
      results.push(...parsed)
      terrainIndex += parsed.length
    }
    return results
  }

  static parse(content: string, startIndex = 0): TerrainCategory[] {
    const results: TerrainCategory[] = []

    const catIdx = content.search(/\bcategories\s*=\s*\{/)
    if (catIdx === -1) return results

    const catOpen = content.indexOf('{', catIdx)
    const catBlock = extractBlock(content, catOpen)
    if (!catBlock) return results

    for (const { name, content: blockContent } of parseNamedBlocks(catBlock.content)) {
      const colorMatch = blockContent.match(/\bcolor\s*=\s*\{\s*(\d+)\s+(\d+)\s+(\d+)\s*\}/)
      if (!colorMatch) continue
      const terrainIndex = startIndex + results.length

      results.push({
        codeName: name,
        color: packColor(parseInt(colorMatch[1]), parseInt(colorMatch[2]), parseInt(colorMatch[3])),
        generatedColor: terrainGeneratedColorFromIndex(terrainIndex)
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

// Walks only the top level of content — returns every `name = { ... }` block found.
// Scalar assignments (`name = value`) are skipped over without recursing.
function parseNamedBlocks(content: string): Array<{ name: string; content: string }> {
  const results: Array<{ name: string; content: string }> = []
  let i = 0

  while (i < content.length) {
    const c = content[i]

    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue }
    if (c === '#') { while (i < content.length && content[i] !== '\n') i++; continue }

    // Read identifier
    const nameStart = i
    while (i < content.length && /\w/.test(content[i])) i++
    if (i === nameStart) { i++; continue }
    const name = content.slice(nameStart, i)

    // Skip horizontal whitespace
    while (i < content.length && (content[i] === ' ' || content[i] === '\t')) i++

    if (content[i] !== '=') {
      // Not an assignment — skip to end of line
      while (i < content.length && content[i] !== '\n') i++
      continue
    }
    i++ // consume '='

    while (i < content.length && (content[i] === ' ' || content[i] === '\t')) i++

    if (content[i] !== '{') {
      // Scalar value — skip to end of line
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
