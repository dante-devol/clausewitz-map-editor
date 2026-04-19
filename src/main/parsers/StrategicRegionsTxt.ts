import { readFileSync } from 'fs'
import type { StrategicRegionDefinition } from '../../shared/mapDataTypes'

export class StrategicRegionsTxt {
  private readonly filePaths: string[]

  constructor(filePaths: string[]) {
    this.filePaths = filePaths
  }

  load(): StrategicRegionDefinition[] {
    const regions = new Map<number, StrategicRegionDefinition>()
    for (const filePath of this.filePaths) {
      const content = readFileSync(filePath, 'utf-8')
      const parsed = StrategicRegionsTxt.parse(content)
      for (const region of parsed) regions.set(region.id, region)
    }
    return [...regions.values()].sort((a, b) => a.id - b.id)
  }

  static parse(content: string): StrategicRegionDefinition[] {
    const regions: StrategicRegionDefinition[] = []

    const blockRegex = /\bstrategic_region\s*=\s*\{/g
    let match: RegExpExecArray | null
    while ((match = blockRegex.exec(content)) !== null) {
      const openIdx = match.index + match[0].length - 1
      const block = extractBlock(content, openIdx)
      if (!block) break

      const regionId = parseScalarNumber(block.content, 'id')
      const provinceIds = parseNumberListBlock(block.content, 'provinces')
      if (regionId !== null && provinceIds.length > 0) regions.push({ id: regionId, provinceIds })

      blockRegex.lastIndex = block.end
    }

    return regions
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

function parseScalarNumber(content: string, key: string): number | null {
  const match = content.match(new RegExp(`\\b${escapeRegExp(key)}\\s*=\\s*(\\d+)\\b`))
  if (!match) return null
  const value = parseInt(match[1], 10)
  return Number.isNaN(value) ? null : value
}

function parseNumberListBlock(content: string, key: string): number[] {
  const match = new RegExp(`\\b${escapeRegExp(key)}\\s*=\\s*\\{`).exec(content)
  if (!match) return []

  const openIdx = match.index + match[0].length - 1
  const block = extractBlock(content, openIdx)
  if (!block) return []

  return [...block.content.matchAll(/\b\d+\b/g)].map((entry) => parseInt(entry[0], 10))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
