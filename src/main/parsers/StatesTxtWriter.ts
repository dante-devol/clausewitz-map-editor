import type {
  DateHistory,
  GenericEffect,
  HistoryDef,
  ProvinceBuildingDefinition,
  StateBuildingDefinition,
  StateDefinition,
  StateHistory,
  StateResource
} from '../../shared/mapDataTypes'
import type { StateSaveRequest } from '../../shared/contract/api'
import { deepEqual } from '../../shared/deepEqual'
import { blockOf, firstAssignment, parseScript, type ScriptAssignment, type ScriptBlock } from './script/ScriptParser'
import { ScriptEditor, formatNumber, formatScalarString, quoteString, type InsertPoint } from './script/ScriptEditor'
import {
  insertInDesiredOrder,
  numericAssignments,
  pairByOccurrence,
  setAssignment,
  setNumberList,
  syncKeyedNumbers
} from './script/ScriptEditing'
import {
  dateKey,
  historyParts,
  isProvinceKey,
  provinceBuildingBlocks,
  readHistoryDef,
  readState,
  readStateId,
  stateAssignments
} from './StatesTxt'

export interface ScriptSaveResult {
  content: string
  conflicts: string[]
}

// Applies state edits to the text of one states file, in place.
//
// For each request only the fields that differ between `original` and
// `updated` are written; every other field keeps its on-disk value. Everything
// else in the file — other states, comments, unknown keys, conditional
// blocks — is left byte-for-byte.
export function applyStateSaves(source: string, requests: readonly StateSaveRequest[]): ScriptSaveResult {
  const doc = parseScript(source)
  const editor = new ScriptEditor(source)
  const conflicts: string[] = []

  const blocksById = new Map<number, ScriptBlock>()
  for (const entry of stateAssignments(doc.root)) {
    const block = entry.value as ScriptBlock
    const id = readStateId(block)
    if (id !== null && !blocksById.has(id)) blocksById.set(id, block)
  }

  for (const { original, updated } of requests) {
    if (original.id !== updated.id) {
      conflicts.push(`State ${original.id}: the state ID cannot be changed.`)
      continue
    }
    const block = blocksById.get(original.id)
    const disk = block ? readState(block, source) : null
    if (!block || !disk) {
      conflicts.push(`State ${original.id}: no longer present in the file on disk.`)
      continue
    }

    const target = mergeState(disk, original, updated)
    editState(editor, source, block, disk, target)
  }

  if (conflicts.length > 0) return { content: source, conflicts }
  return { content: editor.hasEdits ? editor.apply() : source, conflicts }
}

// ─── Merge ──────────────────────────────────────────────────────────────────

// Fields the user didn't edit keep their on-disk value.
function pick<T>(disk: T, original: T, updated: T): T {
  return deepEqual(updated, original) ? disk : updated
}

function mergeState(disk: StateDefinition, original: StateDefinition, updated: StateDefinition): StateDefinition {
  const m = <K extends keyof StateDefinition>(key: K) => pick(disk[key], original[key], updated[key])
  const h = <K extends keyof HistoryDef>(key: K) => pick(disk.history[key], original.history[key], updated.history[key])

  return {
    ...disk,
    name: m('name'),
    manpower: m('manpower'),
    stateCategory: m('stateCategory'),
    isImpassable: m('isImpassable'),
    localSupplies: m('localSupplies'),
    buildingsMaxLevelFactor: m('buildingsMaxLevelFactor'),
    resources: m('resources'),
    provinceIds: m('provinceIds'),
    history: {
      owner: h('owner'),
      coreOf: h('coreOf'),
      victoryPoints: h('victoryPoints'),
      buildings: h('buildings'),
      effects: h('effects'),
      dateHistory: mergeDateHistory(disk.history.dateHistory, original.history.dateHistory, updated.history.dateHistory)
    }
  }
}

// Dated history blocks are merged per date (the n-th block for a date on one
// side pairs with the n-th on the other).
function mergeDateHistory(disk: DateHistory[], original: DateHistory[], updated: DateHistory[]): DateHistory[] {
  const originalByKey = keyedDates(original)
  const updatedByKey = keyedDates(updated)
  const result: DateHistory[] = []

  for (const [key, diskEntry] of keyedDates(disk)) {
    const originalEntry = originalByKey.get(key)
    const updatedEntry = updatedByKey.get(key)
    updatedByKey.delete(key)
    if (!updatedEntry) {
      if (!originalEntry) result.push(diskEntry) // added on disk; otherwise removed by the user
      continue
    }
    result.push(originalEntry ? pick(diskEntry, originalEntry, updatedEntry) : updatedEntry)
  }

  for (const [key, updatedEntry] of updatedByKey) {
    if (!originalByKey.has(key)) result.push(updatedEntry)
  }

  return result
}

function keyedDates(entries: readonly DateHistory[]): Map<string, DateHistory> {
  const counts = new Map<string, number>()
  const result = new Map<string, DateHistory>()
  for (const entry of entries) {
    const base = dateKey(entry.date)
    const occurrence = counts.get(base) ?? 0
    counts.set(base, occurrence + 1)
    result.set(`${base}#${occurrence}`, entry)
  }
  return result
}

// ─── In-place editing ───────────────────────────────────────────────────────

function editState(
  editor: ScriptEditor,
  source: string,
  block: ScriptBlock,
  disk: StateDefinition,
  target: StateDefinition
): void {
  if (disk.name !== target.name) {
    const existing = firstAssignment(block, 'name')
    const quoted = existing?.value.kind === 'scalar' ? existing.value.quoted : true
    setAssignment(editor, block, 'name', quoted ? quoteString(target.name) : formatScalarString(target.name))
  }
  if (disk.manpower !== target.manpower) {
    setAssignment(editor, block, 'manpower', formatNumber(target.manpower))
  }
  if (disk.stateCategory !== target.stateCategory) {
    setAssignment(editor, block, 'state_category', target.stateCategory ? formatScalarString(target.stateCategory) : undefined)
  }
  if (disk.isImpassable !== target.isImpassable) {
    setAssignment(editor, block, 'impassable', target.isImpassable === undefined ? undefined : target.isImpassable ? 'yes' : 'no')
  }
  if (disk.localSupplies !== target.localSupplies) {
    setAssignment(editor, block, 'local_supplies', target.localSupplies === undefined ? undefined : formatNumber(target.localSupplies))
  }
  if (disk.buildingsMaxLevelFactor !== target.buildingsMaxLevelFactor) {
    setAssignment(
      editor, block, 'buildings_max_level_factor',
      target.buildingsMaxLevelFactor === undefined ? undefined : formatNumber(target.buildingsMaxLevelFactor)
    )
  }
  if (!deepEqual(disk.resources, target.resources)) {
    editResources(editor, block, target.resources)
  }
  if (!deepEqual(disk.provinceIds, target.provinceIds)) {
    setNumberList(editor, block, 'provinces', target.provinceIds)
  }
  if (!deepEqual(disk.history, target.history)) {
    const historyEntry = firstAssignment(block, 'history')
    const historyBlock = blockOf(historyEntry)
    if (historyBlock) editStateHistory(editor, source, historyBlock, disk.history, target.history)
    else if (!isEmptyHistory(target.history)) editor.insert(block, { kind: 'end' }, stateHistoryLines(target.history))
  }
}

function editResources(editor: ScriptEditor, block: ScriptBlock, resources: StateResource[] | undefined): void {
  const entry = firstAssignment(block, 'resources')
  const resourcesBlock = blockOf(entry)
  if (!resources || resources.length === 0) {
    if (entry) editor.remove(entry)
    return
  }
  const desired = resources.map((resource) => ({ key: resource.type, value: resource.amount }))
  if (resourcesBlock) {
    syncKeyedNumbers(editor, resourcesBlock, numericAssignments(resourcesBlock), desired, formatNumber, undefined)
  } else {
    editor.insert(block, { kind: 'end' }, ['resources = {', ...desired.map((d) => `\t${d.key} = ${formatNumber(d.value)}`), '}'])
  }
}

function editStateHistory(
  editor: ScriptEditor,
  source: string,
  block: ScriptBlock,
  disk: StateHistory,
  target: StateHistory
): void {
  editHistoryDef(editor, source, block, disk, target)

  if (deepEqual(disk.dateHistory, target.dateHistory)) return
  const parts = historyParts(block, source)
  const diskNodes = new Map<string, ScriptAssignment>()
  const counts = new Map<string, number>()
  for (const { node, date } of parts.dates) {
    const base = dateKey(date)
    const occurrence = counts.get(base) ?? 0
    counts.set(base, occurrence + 1)
    diskNodes.set(`${base}#${occurrence}`, node)
  }

  const diskByKey = keyedDates(disk.dateHistory)
  const targetByKey = keyedDates(target.dateHistory)
  for (const [key, node] of diskNodes) {
    const targetEntry = targetByKey.get(key)
    const diskEntry = diskByKey.get(key)!
    if (!targetEntry) editor.remove(node)
    else if (!deepEqual(diskEntry, targetEntry)) editHistoryDef(editor, source, node.value as ScriptBlock, diskEntry, targetEntry)
  }
  for (const [key, targetEntry] of targetByKey) {
    if (diskNodes.has(key)) continue
    editor.insert(block, { kind: 'end' }, dateHistoryLines(targetEntry))
  }
}

// Brings the top-level entries of a history block from `disk` to `target`.
// Dated sub-blocks are handled by the caller.
function editHistoryDef(
  editor: ScriptEditor,
  source: string,
  block: ScriptBlock,
  disk: HistoryDef,
  target: HistoryDef
): void {
  const parts = historyParts(block, source)
  // New base entries go above the dated blocks so the file stays readable.
  const tail: InsertPoint = parts.dates.length > 0 ? { kind: 'before', entry: parts.dates[0].node } : { kind: 'end' }

  if (disk.owner !== target.owner) {
    const existing = parts.owner[0]
    if (!target.owner) {
      if (existing) editor.remove(existing)
    } else if (existing) {
      editor.replaceValue(existing, formatScalarString(target.owner))
    } else {
      editor.insert(block, { kind: 'start' }, [`owner = ${formatScalarString(target.owner)}`])
    }
  }

  if (!deepEqual(disk.coreOf, target.coreOf)) {
    const pairs = pairByOccurrence(parts.cores, target.coreOf, (node) => node.value.kind === 'scalar' ? node.value.text : '', (tag) => tag)
    for (const node of pairs.unmatchedExisting) editor.remove(node)
    insertInDesiredOrder(
      editor, block, target.coreOf, pairs.desiredMatches, (node) => node,
      (tag) => `add_core_of = ${formatScalarString(tag)}`,
      parts.owner[0] ? { kind: 'after', entry: parts.owner[0] } : tail
    )
  }

  if (!deepEqual(disk.victoryPoints, target.victoryPoints)) {
    const identity = (vp: { province: number; value: number }) => `${vp.province} ${vp.value}`
    const pairs = pairByOccurrence(parts.victoryPoints, target.victoryPoints, (entry) => identity(entry.victoryPoint), identity)
    for (const entry of pairs.unmatchedExisting) editor.remove(entry.node)
    insertInDesiredOrder(
      editor, block, target.victoryPoints, pairs.desiredMatches, (entry) => entry.node,
      (vp) => `victory_points = { ${formatNumber(vp.province)} ${formatNumber(vp.value)} }`,
      tail
    )
  }

  if (!deepEqual(disk.buildings, target.buildings)) {
    const entry = parts.buildings[0]
    if (target.buildings.length === 0) {
      if (entry) editor.remove(entry)
    } else if (entry) {
      editBuildings(editor, entry.value as ScriptBlock, target.buildings)
    } else {
      editor.insert(block, tail, buildingsLines(target.buildings))
    }
  }

  if (!deepEqual(disk.effects, target.effects)) {
    const identity = (effect: GenericEffect) => `${effect.key} ${effect.value}`
    const pairs = pairByOccurrence(parts.effects, target.effects, (entry) => identity(entry.effect), identity)
    for (const entry of pairs.unmatchedExisting) editor.remove(entry.node)
    insertInDesiredOrder(editor, block, target.effects, pairs.desiredMatches, (entry) => entry.node, effectLine, tail)
  }
}

function editBuildings(
  editor: ScriptEditor,
  block: ScriptBlock,
  buildings: (StateBuildingDefinition | ProvinceBuildingDefinition)[]
): void {
  const stateLevel = buildings.filter((b): b is StateBuildingDefinition => !('province' in b))
  const provinceLevel = buildings.filter((b): b is ProvinceBuildingDefinition => 'province' in b)

  const provinceBlocks = provinceBuildingBlocks(block)
  const firstProvinceBlock = provinceBlocks[0]
  syncKeyedNumbers(
    editor,
    block,
    numericAssignments(block, (key) => !isProvinceKey(key)),
    stateLevel.map((b) => ({ key: b.type, value: b.amount })),
    formatNumber,
    firstProvinceBlock ? { kind: 'before', entry: firstProvinceBlock } : undefined
  )

  const desiredByProvince = new Map<number, ProvinceBuildingDefinition[]>()
  for (const b of provinceLevel) {
    const list = desiredByProvince.get(b.province)
    if (list) list.push(b)
    else desiredByProvince.set(b.province, [b])
  }

  const handled = new Set<number>()
  for (const entry of provinceBlocks) {
    const province = Number(entry.key.text)
    const inner = entry.value as ScriptBlock
    const existing = numericAssignments(inner)
    // Only the first block for a province receives the desired entries;
    // any later duplicate block for the same province is emptied.
    const desired = handled.has(province) ? [] : (desiredByProvince.get(province) ?? [])
    handled.add(province)
    const desiredNumbers = desired.map((b) => ({ key: b.type, value: b.amount }))

    if (desiredNumbers.length === 0 && existing.length === inner.entries.length) {
      editor.remove(entry)
      continue
    }
    syncKeyedNumbers(editor, inner, existing, desiredNumbers, formatNumber)
  }

  const newLines: string[] = []
  for (const [province, list] of desiredByProvince) {
    if (handled.has(province)) continue
    newLines.push(`${province} = {`, ...list.map((b) => `\t${b.type} = ${formatNumber(b.amount)}`), '}')
  }
  editor.insert(block, { kind: 'end' }, newLines)
}

// ─── Generation (only for content that doesn't exist in the file yet) ──────

function isEmptyHistory(history: StateHistory): boolean {
  return !history.owner
    && history.coreOf.length === 0
    && history.victoryPoints.length === 0
    && history.buildings.length === 0
    && history.effects.length === 0
    && history.dateHistory.length === 0
}

function stateHistoryLines(history: StateHistory): string[] {
  return [
    'history = {',
    ...historyDefLines(history).map((line) => `\t${line}`),
    ...history.dateHistory.flatMap(dateHistoryLines).map((line) => `\t${line}`),
    '}'
  ]
}

function dateHistoryLines(entry: DateHistory): string[] {
  return [`${dateKey(entry.date)} = {`, ...historyDefLines(entry).map((line) => `\t${line}`), '}']
}

function historyDefLines(def: HistoryDef): string[] {
  const lines: string[] = []
  if (def.owner) lines.push(`owner = ${formatScalarString(def.owner)}`)
  for (const tag of def.coreOf) lines.push(`add_core_of = ${formatScalarString(tag)}`)
  for (const vp of def.victoryPoints) lines.push(`victory_points = { ${formatNumber(vp.province)} ${formatNumber(vp.value)} }`)
  if (def.buildings.length > 0) lines.push(...buildingsLines(def.buildings))
  lines.push(...def.effects.map(effectLine))
  return lines
}

function buildingsLines(buildings: (StateBuildingDefinition | ProvinceBuildingDefinition)[]): string[] {
  const lines = ['buildings = {']
  for (const b of buildings) {
    if (!('province' in b)) lines.push(`\t${b.type} = ${formatNumber(b.amount)}`)
  }
  const byProvince = new Map<number, ProvinceBuildingDefinition[]>()
  for (const b of buildings) {
    if (!('province' in b)) continue
    const list = byProvince.get(b.province)
    if (list) list.push(b)
    else byProvince.set(b.province, [b])
  }
  for (const [province, list] of byProvince) {
    lines.push(`\t${province} = {`, ...list.map((b) => `\t\t${b.type} = ${formatNumber(b.amount)}`), '\t}')
  }
  lines.push('}')
  return lines
}

// Block values are written verbatim; scalars are quoted only when they need it.
function effectLine(effect: GenericEffect): string {
  const value = effect.value.trimStart().startsWith('{')
    ? effect.value
    : effect.value === '' || /\s/.test(effect.value) ? quoteString(effect.value) : effect.value
  return `${effect.key} = ${value}`
}
