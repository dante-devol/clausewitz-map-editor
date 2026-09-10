import type { ScriptAssignment, ScriptBlock, ScriptEntry } from './ScriptParser'
import { assignmentsOf, firstAssignment, isNumeric, parseNumber } from './ScriptParser'
import type { InsertPoint, ScriptEditor } from './ScriptEditor'

// Higher-level edit helpers shared by the state and strategic-region writers.

// Sets `key = text` on the first direct assignment, inserting it when missing.
// A `text` of undefined removes the assignment.
export function setAssignment(
  editor: ScriptEditor,
  block: ScriptBlock,
  key: string,
  text: string | undefined,
  insertAt: InsertPoint = { kind: 'end' }
): void {
  const existing = firstAssignment(block, key)
  if (text === undefined) {
    if (existing) editor.remove(existing)
    return
  }
  if (existing) editor.replaceValue(existing, text)
  else editor.insert(block, insertAt, [`${key} = ${text}`])
}

// Replaces or inserts `key = { n n n }`, keeping a multi-line layout when the
// existing block already used one.
export function setNumberList(
  editor: ScriptEditor,
  block: ScriptBlock,
  key: string,
  values: readonly number[],
  format: (value: number) => string = String,
  insertAt: InsertPoint = { kind: 'end' }
): void {
  const joined = values.map(format).join(' ')
  const existing = firstAssignment(block, key)
  if (!existing) {
    editor.insert(block, insertAt, [`${key} = { ${joined} }`])
    return
  }
  const src = editor.source
  const oldText = src.slice(existing.value.start, existing.value.end)
  if (oldText.includes('\n') && existing.value.kind === 'block') {
    const indent = indentAt(src, existing.start)
    editor.replaceValue(existing, `{${editor.eol}${indent}\t${joined}${editor.eol}${indent}}`)
  } else {
    editor.replaceValue(existing, `{ ${joined} }`)
  }
}

export interface KeyedNumber {
  key: string
  value: number
}

export interface KeyedNumberNode extends KeyedNumber {
  node: ScriptAssignment
}

// Direct `key = <number>` assignments in a block, optionally filtered by key.
export function numericAssignments(
  block: ScriptBlock,
  include: (key: string) => boolean = () => true
): KeyedNumberNode[] {
  const result: KeyedNumberNode[] = []
  for (const entry of assignmentsOf(block)) {
    if (entry.operator !== '=' || entry.value.kind !== 'scalar' || !isNumeric(entry.value.text)) continue
    if (!include(entry.key.text)) continue
    result.push({ key: entry.key.text, value: parseNumber(entry.value.text)!, node: entry })
  }
  return result
}

// Makes the existing keyed numbers match `desired` with minimal edits:
// entries are paired by (key, occurrence); unpaired existing entries are
// removed, changed values replaced, and new entries inserted.
export function syncKeyedNumbers(
  editor: ScriptEditor,
  block: ScriptBlock,
  existing: readonly KeyedNumberNode[],
  desired: readonly KeyedNumber[],
  format: (value: number) => string,
  insertAt?: InsertPoint
): { removed: number; kept: number } {
  const pairs = pairByOccurrence(existing, desired, (item) => item.key)
  let removed = 0
  for (const node of pairs.unmatchedExisting) {
    editor.remove(node.node)
    removed++
  }
  for (const [node, item] of pairs.matched) {
    if (node.value !== item.value) editor.replaceValue(node.node, format(item.value))
  }
  insertInDesiredOrder(
    editor,
    block,
    desired,
    pairs.desiredMatches,
    (node) => node.node,
    (item) => `${item.key} = ${format(item.value)}`,
    insertAt ?? { kind: 'end' }
  )
  return { removed, kept: pairs.matched.length }
}

// Inserts the desired items that have no existing counterpart, placing each
// run of new items just before the next item that already exists (or after the
// last existing one), so the file ends up in the requested order wherever the
// existing entries allow it. `fallback` is used when nothing matched.
export function insertInDesiredOrder<A, B>(
  editor: ScriptEditor,
  block: ScriptBlock,
  desired: readonly B[],
  matches: readonly (A | undefined)[],
  nodeOf: (item: A) => ScriptEntry,
  lineOf: (item: B) => string,
  fallback: InsertPoint
): void {
  let pending: string[] = []
  let lastNode: ScriptEntry | undefined
  desired.forEach((item, index) => {
    const match = matches[index]
    if (match === undefined) {
      pending.push(lineOf(item))
      return
    }
    const node = nodeOf(match)
    if (pending.length > 0) {
      editor.insert(block, { kind: 'before', entry: node }, pending)
      pending = []
    }
    lastNode = node
  })
  if (pending.length > 0) {
    editor.insert(block, lastNode ? { kind: 'after', entry: lastNode } : fallback, pending)
  }
}

// Pairs items of two lists that share an identity, matching the n-th
// occurrence of an identity in one list with the n-th in the other.
export function pairByOccurrence<A, B>(
  existing: readonly A[],
  desired: readonly B[],
  identityA: (item: A) => string,
  identityB: (item: B) => string = identityA as unknown as (item: B) => string
): { matched: [A, B][]; unmatchedExisting: A[]; unmatchedDesired: B[]; desiredMatches: (A | undefined)[] } {
  const buckets = new Map<string, A[]>()
  for (const item of existing) {
    const id = identityA(item)
    const bucket = buckets.get(id)
    if (bucket) bucket.push(item)
    else buckets.set(id, [item])
  }

  const matched: [A, B][] = []
  const matchedSet = new Set<A>()
  const unmatchedDesired: B[] = []
  const desiredMatches: (A | undefined)[] = []
  for (const item of desired) {
    const bucket = buckets.get(identityB(item))
    const partner = bucket?.shift()
    desiredMatches.push(partner)
    if (partner !== undefined) {
      matched.push([partner, item])
      matchedSet.add(partner)
    } else {
      unmatchedDesired.push(item)
    }
  }

  // Keep `matched` in file order so "insert after last kept" is well defined.
  const order = new Map(existing.map((item, index) => [item, index]))
  matched.sort((a, b) => order.get(a[0])! - order.get(b[0])!)

  return {
    matched,
    unmatchedExisting: existing.filter((item) => !matchedSet.has(item)),
    unmatchedDesired,
    desiredMatches
  }
}

function indentAt(src: string, index: number): string {
  const lineStart = src.lastIndexOf('\n', index - 1) + 1
  const match = /^[ \t]*/.exec(src.slice(lineStart, index))
  return match ? match[0] : ''
}
