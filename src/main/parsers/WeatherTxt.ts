import { readFileSync } from 'fs'

export class WeatherTxt {
  static load(filePath: string): string[] {
    try {
      const content = readFileSync(filePath, 'utf-8')
      return WeatherTxt.parse(content)
    } catch {
      return []
    }
  }

  static parse(content: string): string[] {
    const modifiersMatch = /\bterrain_modifiers\s*=\s*\{/.exec(content)
    if (!modifiersMatch) return []

    const openIdx = modifiersMatch.index + modifiersMatch[0].length - 1
    const block = extractBlock(content, openIdx)
    if (!block) return []

    const names: string[] = []
    // Top-level children of terrain_modifiers are key = { ... } entries
    const entryRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\{/g
    let m: RegExpExecArray | null
    while ((m = entryRegex.exec(block.content)) !== null) {
      names.push(m[1])
      // Skip past this entry's block so we don't pick up nested keys
      const entryOpenIdx = m.index + m[0].length - 1
      const entryBlock = extractBlock(block.content, entryOpenIdx)
      if (entryBlock) entryRegex.lastIndex = entryBlock.end
    }

    return names
  }
}

interface Block {
  content: string
  end: number
}

function extractBlock(str: string, openIdx: number): Block | null {
  let depth = 0
  for (let i = openIdx; i < str.length; i++) {
    if (str[i] === '{') depth++
    else if (str[i] === '}') {
      depth--
      if (depth === 0) return { content: str.slice(openIdx + 1, i), end: i + 1 }
    } else if (str[i] === '#') {
      while (i < str.length && str[i] !== '\n') i++
    }
  }
  return null
}
