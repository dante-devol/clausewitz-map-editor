import { readFileSync } from 'fs'
import type { StateDefinition } from '../../shared/mapDataTypes'

export class StatesTxt {
  private readonly filePaths: string[]

  constructor(filePaths: string[]) {
    this.filePaths = filePaths
  }

  load(): StateDefinition[] {
    const states = new Map<number, StateDefinition>()
    for (const filePath of this.filePaths) {
      const content = readFileSync(filePath, 'utf-8')
      mergeStates(states, StatesTxt.parse(content))
    }
    return [...states.values()].sort((a, b) => a.id - b.id)
  }

  static parse(content: string): StateDefinition[] {
    const states: StateDefinition[] = []

    for (const blockContent of parseTopLevelNamedBlocks(content, 'state')) {
      const stateId = parseScalarNumber(blockContent, 'id')
      const provinceIds = parseNumberListBlock(blockContent, 'provinces')
      if (stateId === null || provinceIds.length === 0) continue

      states.push({ id: stateId, provinceIds })
    }

    return states
  }
}

function mergeStates(target: Map<number, StateDefinition>, source: StateDefinition[]): void {
  for (const state of source) {
    target.set(state.id, state)
  }
}

function parseTopLevelNamedBlocks(content: string, blockName: string): string[] {
  const results: string[] = []
  let i = 0

  while (i < content.length) {
    const c = content[i]
    if (isWhitespace(c)) { i++; continue }
    if (c === '#') { i = skipComment(content, i); continue }

    const nameStart = i
    while (i < content.length && /[\w.]/.test(content[i])) i++
    if (i === nameStart) { i++; continue }

    const name = content.slice(nameStart, i)
    while (i < content.length && (content[i] === ' ' || content[i] === '\t')) i++

    if (content[i] !== '=') {
      i = skipLine(content, i)
      continue
    }
    i++
    while (i < content.length && isWhitespace(content[i])) i++

    if (content[i] !== '{') {
      i = skipLine(content, i)
      continue
    }

    const block = extractBlock(content, i)
    if (!block) break

    if (name === blockName) results.push(block.content)
    i = block.end
  }

  return results
}

function parseScalarNumber(content: string, key: string): number | null {
  const escaped = escapeRegExp(key)
  const match = content.match(new RegExp(`\\b${escaped}\\s*=\\s*(\\d+)\\b`))
  if (!match) return null
  const value = parseInt(match[1], 10)
  return Number.isNaN(value) ? null : value
}

function parseNumberListBlock(content: string, key: string): number[] {
  const escaped = escapeRegExp(key)
  const match = new RegExp(`\\b${escaped}\\s*=\\s*\\{`).exec(content)
  if (!match) return []

  const openIdx = match.index + match[0].length - 1
  const block = extractBlock(content, openIdx)
  if (!block) return []

  return [...block.content.matchAll(/\b\d+\b/g)].map((entry) => parseInt(entry[0], 10))
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
      i = skipComment(str, i) - 1
    }
  }
  return null
}

function skipComment(content: string, start: number): number {
  let i = start
  while (i < content.length && content[i] !== '\n') i++
  return i
}

function skipLine(content: string, start: number): number {
  let i = start
  while (i < content.length && content[i] !== '\n') i++
  return i
}

function isWhitespace(value: string): boolean {
  return value === ' ' || value === '\t' || value === '\r' || value === '\n'
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
