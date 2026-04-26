import { readFileSync } from 'fs'
import type { Resource } from '../../shared/mapDataTypes'

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
    const results: Resource[] = []

    const resIdx = content.search(/\bresources\s*=\s*\{/)
    if (resIdx === -1) return results

    const resOpen = content.indexOf('{', resIdx)
    const resBlock = extractBlock(content, resOpen)
    if (!resBlock) return results

    for (const { name } of parseNamedBlocks(resBlock.content)) {
      results.push({ codeName: name })
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
