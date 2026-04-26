import { readFileSync } from 'fs'
import type {
  DateHistory,
  HistoryDef,
  ProvinceBuildingDefinition,
  StateBuildingDefinition,
  StateDefinition,
  StateHistory,
  StateResource,
  VictoryPoint
} from '../../shared/mapDataTypes'

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

      const historyBlockContent = parseBlockContent(blockContent, 'history')
      const history: StateHistory = historyBlockContent
        ? { ...parseHistoryDef(historyBlockContent), dateHistory: parseDateHistories(historyBlockContent) }
        : { owner: undefined, coreOf: [], buildings: [], victoryPoints: [], dateHistory: [] }

      const resources = parseResources(blockContent)

      const state: StateDefinition = {
        id: stateId,
        name: parseScalarString(blockContent, 'name') ?? '',
        provinceIds,
        manpower: parseScalarNumber(blockContent, 'manpower') ?? 0,
        stateCategory: parseScalarString(blockContent, 'state_category') ?? '',
        history
      }

      if (resources !== undefined) state.resources = resources
      const isImpassable = parseScalarBool(blockContent, 'is_impassable')
      if (isImpassable !== null) state.isImpassable = isImpassable
      const localSupplies = parseScalarFloat(blockContent, 'local_supplies')
      if (localSupplies !== null) state.localSupplies = localSupplies
      const buildingsMaxLevelFactor = parseScalarFloat(blockContent, 'buildings_max_level_factor')
      if (buildingsMaxLevelFactor !== null) state.buildingsMaxLevelFactor = buildingsMaxLevelFactor

      states.push(state)
    }

    return states
  }
}

function mergeStates(target: Map<number, StateDefinition>, source: StateDefinition[]): void {
  for (const state of source) {
    target.set(state.id, state)
  }
}

function parseHistoryDef(content: string): Omit<HistoryDef, never> {
  return {
    owner: parseScalarString(content, 'owner') ?? undefined,
    coreOf: parseCoreOf(content),
    buildings: parseHistoryBuildings(content),
    victoryPoints: parseVictoryPoints(content)
  }
}

function parseDateHistories(historyContent: string): DateHistory[] {
  const results: DateHistory[] = []
  const dateRegex = /\b(\d{4})\.(\d{1,2})\.(\d{1,2})\s*=\s*\{/g
  let match: RegExpExecArray | null
  while ((match = dateRegex.exec(historyContent)) !== null) {
    const openIdx = match.index + match[0].length - 1
    const block = extractBlock(historyContent, openIdx)
    if (!block) continue
    results.push({
      date: { year: parseInt(match[1]), month: parseInt(match[2]), day: parseInt(match[3]) },
      ...parseHistoryDef(block.content)
    })
    dateRegex.lastIndex = block.end
  }
  return results
}

function parseCoreOf(content: string): string[] {
  const results: string[] = []
  const regex = /\bcore_of\s*=\s*/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    const afterEq = match.index + match[0].length
    if (content[afterEq] === '{') {
      const block = extractBlock(content, afterEq)
      if (block) {
        results.push(...block.content.trim().split(/\s+/).filter(Boolean))
        regex.lastIndex = block.end
      }
    } else {
      const wordMatch = content.slice(afterEq).match(/^(\w+)/)
      if (wordMatch) results.push(wordMatch[1])
    }
  }
  return results
}

function parseVictoryPoints(content: string): VictoryPoint[] {
  const results: VictoryPoint[] = []
  const regex = /\bvictory_points\s*=\s*\{/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    const openIdx = match.index + match[0].length - 1
    const block = extractBlock(content, openIdx)
    if (!block) continue
    const nums = [...block.content.matchAll(/\b(\d+)\b/g)].map((m) => parseInt(m[1]))
    if (nums.length >= 2) results.push({ province: nums[0], value: nums[1] })
    regex.lastIndex = block.end
  }
  return results
}

function parseHistoryBuildings(content: string): (StateBuildingDefinition | ProvinceBuildingDefinition)[] {
  const blockContent = parseBlockContent(content, 'buildings')
  if (!blockContent) return []

  const results: (StateBuildingDefinition | ProvinceBuildingDefinition)[] = []
  let i = 0

  while (i < blockContent.length) {
    const c = blockContent[i]
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue }
    if (c === '#') { while (i < blockContent.length && blockContent[i] !== '\n') i++; continue }

    const keyStart = i
    while (i < blockContent.length && /\w/.test(blockContent[i])) i++
    if (i === keyStart) { i++; continue }
    const key = blockContent.slice(keyStart, i)

    while (i < blockContent.length && (blockContent[i] === ' ' || blockContent[i] === '\t')) i++
    if (blockContent[i] !== '=') { while (i < blockContent.length && blockContent[i] !== '\n') i++; continue }
    i++ // consume '='
    while (i < blockContent.length && (blockContent[i] === ' ' || blockContent[i] === '\t')) i++

    if (blockContent[i] === '{') {
      const block = extractBlock(blockContent, i)
      if (/^\d+$/.test(key) && block) {
        const province = parseInt(key)
        for (const [, type, amount] of block.content.matchAll(/\b(\w+)\s*=\s*(\d+)\b/g)) {
          results.push({ province, type, amount: parseInt(amount) })
        }
        i = block.end
      } else {
        i = block ? block.end : i + 1
      }
    } else if (!/^\d+$/.test(key)) {
      const numMatch = blockContent.slice(i).match(/^(\d+)\b/)
      if (numMatch) {
        results.push({ type: key, amount: parseInt(numMatch[1]) })
        i += numMatch[0].length
      } else {
        while (i < blockContent.length && blockContent[i] !== '\n') i++
      }
    } else {
      while (i < blockContent.length && blockContent[i] !== '\n') i++
    }
  }

  return results
}

function parseResources(content: string): StateResource[] | undefined {
  const blockContent = parseBlockContent(content, 'resources')
  if (!blockContent) return undefined
  const results: StateResource[] = []
  for (const [, type, amount] of blockContent.matchAll(/\b(\w+)\s*=\s*(\d+)\b/g)) {
    results.push({ type, amount: parseInt(amount) })
  }
  return results.length > 0 ? results : undefined
}

function parseBlockContent(content: string, key: string): string | null {
  const escaped = escapeRegExp(key)
  const match = new RegExp(`\\b${escaped}\\s*=\\s*\\{`).exec(content)
  if (!match) return null
  const openIdx = match.index + match[0].length - 1
  const block = extractBlock(content, openIdx)
  return block ? block.content : null
}

function parseScalarString(content: string, key: string): string | null {
  const escaped = escapeRegExp(key)
  const quotedMatch = content.match(new RegExp(`\\b${escaped}\\s*=\\s*"([^"]*)"`))
  if (quotedMatch) return quotedMatch[1]
  const bareMatch = content.match(new RegExp(`\\b${escaped}\\s*=\\s*(\\w+)\\b`))
  return bareMatch ? bareMatch[1] : null
}

function parseScalarFloat(content: string, key: string): number | null {
  const escaped = escapeRegExp(key)
  const match = content.match(new RegExp(`\\b${escaped}\\s*=\\s*([\\d.]+)\\b`))
  if (!match) return null
  const value = parseFloat(match[1])
  return Number.isNaN(value) ? null : value
}

function parseScalarBool(content: string, key: string): boolean | null {
  const escaped = escapeRegExp(key)
  const match = content.match(new RegExp(`\\b${escaped}\\s*=\\s*(yes|no)\\b`))
  if (!match) return null
  return match[1] === 'yes'
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
