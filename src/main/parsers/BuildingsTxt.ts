import { readFileSync } from 'fs'
import type { Building, LevelCap } from '../../shared/mapDataTypes'

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
    const results: Building[] = []

    const bldIdx = content.search(/\bbuildings\s*=\s*\{/)
    if (bldIdx === -1) return results

    const bldOpen = content.indexOf('{', bldIdx)
    const bldBlock = extractBlock(content, bldOpen)
    if (!bldBlock) return results

    for (const { name, content: blockContent } of parseNamedBlocks(bldBlock.content)) {
      const levelCap = parseLevelCap(blockContent)
      if (!levelCap) continue
      results.push({ codeName: name, levelCap })
    }

    return results
  }
}

function parseLevelCap(content: string): LevelCap | null {
  const lcIdx = content.search(/\blevel_cap\s*=\s*\{/)
  if (lcIdx === -1) return null

  const lcOpen = content.indexOf('{', lcIdx)
  const lcBlock = extractBlock(content, lcOpen)
  if (!lcBlock) return null

  const c = lcBlock.content

  const sharesMatch = c.match(/\bshares_slots\s*=\s*(yes|no)\b/)
  const provinceMaxMatch = c.match(/\bprovince_max\s*=\s*(\d+)\b/)
  const stateMaxMatch = c.match(/\bstate_max\s*=\s*(\d+)\b/)
  const groupByMatch = c.match(/\bgroup_by\s*=\s*(\w+)\b/)
  const exclusiveMatch = c.match(/\bexclusive_with\s*=\s*(\w+)\b/)

  return {
    sharesSlots: sharesMatch ? sharesMatch[1] === 'yes' : false,
    provinceMax: provinceMaxMatch ? parseInt(provinceMaxMatch[1]) : undefined,
    stateMax: stateMaxMatch ? parseInt(stateMaxMatch[1]) : undefined,
    groupBy: groupByMatch ? groupByMatch[1] : undefined,
    exclusiveWith: exclusiveMatch ? exclusiveMatch[1] : undefined
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
