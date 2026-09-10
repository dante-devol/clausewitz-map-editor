import type {
  DateHistory,
  GenericEffect,
  HistoryDef,
  ProvinceBuildingDefinition,
  StateBuildingDefinition,
  StateDefinition,
  StateHistory,
  StateResource,
  VictoryPoint
} from '../../shared/mapDataTypes'
import {
  assignmentsOf,
  bareNumbers,
  blockOf,
  firstAssignment,
  numberOf,
  parseScript,
  scalarOf,
  type ScriptAssignment,
  type ScriptBlock
} from './script/ScriptParser'
import { numericAssignments } from './script/ScriptEditing'

export class StatesTxt {
  static parse(content: string): StateDefinition[] {
    const doc = parseScript(content)
    const states: StateDefinition[] = []
    for (const entry of stateAssignments(doc.root)) {
      const state = readState(entry.value as ScriptBlock, content)
      if (state) states.push(state)
    }
    return states
  }
}

// Top-level `state = { ... }` blocks.
export function stateAssignments(root: ScriptBlock): ScriptAssignment[] {
  return assignmentsOf(root, 'state').filter((entry) => entry.value.kind === 'block')
}

export function readStateId(block: ScriptBlock): number | null {
  return numberOf(firstAssignment(block, 'id'))
}

export function readState(block: ScriptBlock, source: string): StateDefinition | null {
  const id = readStateId(block)
  const provincesBlock = blockOf(firstAssignment(block, 'provinces'))
  const provinceIds = provincesBlock ? bareNumbers(provincesBlock) : []
  if (id === null || provinceIds.length === 0) return null

  const historyBlock = blockOf(firstAssignment(block, 'history'))
  const history: StateHistory = historyBlock
    ? readStateHistory(historyBlock, source)
    : { owner: undefined, coreOf: [], buildings: [], victoryPoints: [], effects: [], dateHistory: [] }

  const state: StateDefinition = {
    id,
    name: scalarOf(firstAssignment(block, 'name')) ?? '',
    provinceIds,
    manpower: numberOf(firstAssignment(block, 'manpower')) ?? 0,
    stateCategory: scalarOf(firstAssignment(block, 'state_category')) ?? '',
    history
  }

  const resources = readResources(block)
  if (resources !== undefined) state.resources = resources
  const impassable = scalarOf(firstAssignment(block, 'impassable'))
  if (impassable === 'yes' || impassable === 'no') state.isImpassable = impassable === 'yes'
  const localSupplies = numberOf(firstAssignment(block, 'local_supplies'))
  if (localSupplies !== null) state.localSupplies = localSupplies
  const buildingsMaxLevelFactor = numberOf(firstAssignment(block, 'buildings_max_level_factor'))
  if (buildingsMaxLevelFactor !== null) state.buildingsMaxLevelFactor = buildingsMaxLevelFactor

  return state
}

export function readResources(block: ScriptBlock): StateResource[] | undefined {
  const resourcesBlock = blockOf(firstAssignment(block, 'resources'))
  if (!resourcesBlock) return undefined
  const resources = numericAssignments(resourcesBlock).map(({ key, value }) => ({ type: key, amount: value }))
  return resources.length > 0 ? resources : undefined
}

// ─── History ────────────────────────────────────────────────────────────────

const DATE_KEY_RE = /^(\d+)\.(\d+)\.(\d+)$/

export interface DatedHistoryNode {
  node: ScriptAssignment
  date: DateHistory['date']
}

// The direct children of a history (or dated history) block, by role. Only the
// top level is considered: entries inside dated blocks or `if` blocks belong to
// those blocks and are never hoisted.
export interface HistoryParts {
  owner: ScriptAssignment[]
  cores: ScriptAssignment[]
  victoryPoints: { node: ScriptAssignment; victoryPoint: VictoryPoint }[]
  buildings: ScriptAssignment[]
  effects: { node: ScriptAssignment; effect: GenericEffect }[]
  dates: DatedHistoryNode[]
}

export function historyParts(block: ScriptBlock, source: string): HistoryParts {
  const parts: HistoryParts = { owner: [], cores: [], victoryPoints: [], buildings: [], effects: [], dates: [] }

  for (const entry of assignmentsOf(block)) {
    if (entry.operator !== '=') continue
    const key = entry.key.text.toLowerCase()
    const value = entry.value

    if (key === 'owner' && value.kind === 'scalar') {
      parts.owner.push(entry)
      continue
    }
    if (key === 'add_core_of' && value.kind === 'scalar') {
      parts.cores.push(entry)
      continue
    }
    if (key === 'victory_points' && value.kind === 'block') {
      const numbers = bareNumbers(value)
      if (numbers.length >= 2) {
        parts.victoryPoints.push({ node: entry, victoryPoint: { province: numbers[0], value: numbers[1] } })
        continue
      }
    }
    if (key === 'buildings' && value.kind === 'block') {
      parts.buildings.push(entry)
      continue
    }
    const dateMatch = DATE_KEY_RE.exec(entry.key.text)
    if (dateMatch && value.kind === 'block') {
      parts.dates.push({
        node: entry,
        date: { year: Number(dateMatch[1]), month: Number(dateMatch[2]), day: Number(dateMatch[3]) }
      })
      continue
    }

    parts.effects.push({
      node: entry,
      effect: {
        key: entry.key.text,
        value: value.kind === 'scalar' ? value.text : source.slice(value.start, value.end)
      }
    })
  }

  return parts
}

export function readHistoryDef(parts: HistoryParts): HistoryDef {
  const buildingsBlock = parts.buildings[0]?.value
  return {
    owner: parts.owner[0] ? scalarOf(parts.owner[0]) : undefined,
    coreOf: parts.cores.map((entry) => scalarOf(entry)!),
    buildings: buildingsBlock?.kind === 'block' ? readBuildings(buildingsBlock) : [],
    victoryPoints: parts.victoryPoints.map((entry) => entry.victoryPoint),
    effects: parts.effects.map((entry) => entry.effect)
  }
}

export function readStateHistory(block: ScriptBlock, source: string): StateHistory {
  const parts = historyParts(block, source)
  return {
    ...readHistoryDef(parts),
    dateHistory: parts.dates.map(({ node, date }) => ({
      date,
      ...readHistoryDef(historyParts(node.value as ScriptBlock, source))
    }))
  }
}

export function isProvinceKey(key: string): boolean {
  return /^\d+$/.test(key)
}

export function readBuildings(block: ScriptBlock): (StateBuildingDefinition | ProvinceBuildingDefinition)[] {
  const result: (StateBuildingDefinition | ProvinceBuildingDefinition)[] = []
  for (const { key, value } of numericAssignments(block, (k) => !isProvinceKey(k))) {
    result.push({ type: key, amount: value })
  }
  for (const entry of provinceBuildingBlocks(block)) {
    const province = Number(entry.key.text)
    for (const { key, value } of numericAssignments(entry.value as ScriptBlock)) {
      result.push({ province, type: key, amount: value })
    }
  }
  return result
}

// `<province id> = { ... }` entries inside a buildings block.
export function provinceBuildingBlocks(block: ScriptBlock): ScriptAssignment[] {
  return assignmentsOf(block).filter((entry) => isProvinceKey(entry.key.text) && entry.value.kind === 'block')
}

export function dateKey(date: DateHistory['date']): string {
  return `${date.year}.${date.month}.${date.day}`
}
