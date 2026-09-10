// Reader for Paradox (Clausewitz) script files.
//
// Every node records its source span, so writers can edit the original text in
// place (see ScriptEditor) instead of regenerating it. Comments, whitespace and
// anything a domain model doesn't understand survive untouched.
//
// The parser is deliberately tolerant: stray braces or operators are skipped and
// an unclosed block runs to the end of the file, mirroring how the game reads.

export interface ScriptScalar {
  kind: 'scalar'
  // Text without surrounding quotes. Escape sequences are kept as written.
  text: string
  quoted: boolean
  start: number
  end: number
}

export interface ScriptBlock {
  kind: 'block'
  entries: ScriptEntry[]
  // Index of '{' (0 for the document root).
  start: number
  // Index just past '}' (source length for the root or an unclosed block).
  end: number
  closed: boolean
  root: boolean
}

export type ScriptValue = ScriptScalar | ScriptBlock

export interface ScriptAssignment {
  kind: 'assignment'
  key: ScriptScalar
  operator: string
  value: ScriptValue
  start: number
  end: number
}

// Blocks contain assignments (`key = value`) and bare values (`{ 1 2 3 }`).
export type ScriptEntry = ScriptAssignment | ScriptValue

export interface ScriptDocument {
  source: string
  root: ScriptBlock
}

type TokenType = 'open' | 'close' | 'operator' | 'word' | 'string'

interface Token {
  type: TokenType
  text: string
  start: number
  end: number
}

export function parseScript(source: string): ScriptDocument {
  const tokens = tokenize(source)
  const parser = new Parser(source, tokens)
  const root: ScriptBlock = {
    kind: 'block',
    entries: parser.parseEntries(false),
    start: 0,
    end: source.length,
    closed: false,
    root: true
  }
  return { source, root }
}

// ─── Queries ────────────────────────────────────────────────────────────────

// Direct `key = value` children of a block. Keys compare case-insensitively.
export function assignmentsOf(block: ScriptBlock, key?: string): ScriptAssignment[] {
  const wanted = key?.toLowerCase()
  const result: ScriptAssignment[] = []
  for (const entry of block.entries) {
    if (entry.kind !== 'assignment') continue
    if (wanted !== undefined && entry.key.text.toLowerCase() !== wanted) continue
    result.push(entry)
  }
  return result
}

export function firstAssignment(block: ScriptBlock, key: string): ScriptAssignment | undefined {
  const wanted = key.toLowerCase()
  for (const entry of block.entries) {
    if (entry.kind === 'assignment' && entry.key.text.toLowerCase() === wanted) return entry
  }
  return undefined
}

// Depth-first search for the first assignment with the given key at any depth.
export function findAssignmentDeep(block: ScriptBlock, key: string): ScriptAssignment | undefined {
  const wanted = key.toLowerCase()
  for (const entry of block.entries) {
    if (entry.kind === 'assignment') {
      if (entry.key.text.toLowerCase() === wanted) return entry
      if (entry.value.kind === 'block') {
        const nested = findAssignmentDeep(entry.value, key)
        if (nested) return nested
      }
    } else if (entry.kind === 'block') {
      const nested = findAssignmentDeep(entry, key)
      if (nested) return nested
    }
  }
  return undefined
}

export function blockOf(entry: ScriptAssignment | undefined): ScriptBlock | undefined {
  return entry?.value.kind === 'block' ? entry.value : undefined
}

export function scalarOf(entry: ScriptAssignment | undefined): string | undefined {
  return entry?.value.kind === 'scalar' ? entry.value.text : undefined
}

export function numberOf(entry: ScriptAssignment | undefined): number | null {
  const text = scalarOf(entry)
  return text === undefined ? null : parseNumber(text)
}

// Bare scalar values directly inside a block (e.g. the ids in `provinces = { 1 2 3 }`).
export function bareScalars(block: ScriptBlock): ScriptScalar[] {
  return block.entries.filter((entry): entry is ScriptScalar => entry.kind === 'scalar')
}

export function bareNumbers(block: ScriptBlock): number[] {
  const result: number[] = []
  for (const scalar of bareScalars(block)) {
    const value = parseNumber(scalar.text)
    if (value !== null) result.push(value)
  }
  return result
}

const NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)$/

export function parseNumber(text: string): number | null {
  return NUMBER_RE.test(text) ? Number(text) : null
}

export function isNumeric(text: string): boolean {
  return NUMBER_RE.test(text)
}

// ─── Tokenizer ──────────────────────────────────────────────────────────────

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  const length = source.length
  let i = 0

  while (i < length) {
    const ch = source[i]

    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === '﻿' || ch === '\f' || ch === '\v') {
      i++
      continue
    }

    if (ch === '#') {
      while (i < length && source[i] !== '\n') i++
      continue
    }

    if (ch === '{' || ch === '}') {
      tokens.push({ type: ch === '{' ? 'open' : 'close', text: ch, start: i, end: i + 1 })
      i++
      continue
    }

    if (ch === '"') {
      let j = i + 1
      while (j < length && source[j] !== '"') {
        if (source[j] === '\\' && j + 1 < length) j++
        j++
      }
      const end = Math.min(j + 1, length)
      tokens.push({ type: 'string', text: source.slice(i + 1, Math.min(j, length)), start: i, end })
      i = end
      continue
    }

    const operatorLength = operatorAt(source, i)
    if (operatorLength > 0) {
      tokens.push({ type: 'operator', text: source.slice(i, i + operatorLength), start: i, end: i + operatorLength })
      i += operatorLength
      continue
    }

    let j = i
    while (j < length && !isWordBoundary(source, j)) j++
    if (j === i) j = i + 1
    tokens.push({ type: 'word', text: source.slice(i, j), start: i, end: j })
    i = j
  }

  return tokens
}

function operatorAt(source: string, i: number): number {
  const ch = source[i]
  const next = source[i + 1]
  if ((ch === '<' || ch === '>' || ch === '!' || ch === '?' || ch === '=') && next === '=') return 2
  if (ch === '=' || ch === '<' || ch === '>') return 1
  return 0
}

function isWordBoundary(source: string, i: number): boolean {
  const ch = source[i]
  if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === '\f' || ch === '\v') return true
  if (ch === '{' || ch === '}' || ch === '"' || ch === '#') return true
  return operatorAt(source, i) > 0
}

// ─── Parser ─────────────────────────────────────────────────────────────────

class Parser {
  private pos = 0

  constructor(
    private readonly source: string,
    private readonly tokens: Token[]
  ) {}

  // Parses entries until the matching '}' (nested) or end of input (root).
  parseEntries(nested: boolean): ScriptEntry[] {
    const entries: ScriptEntry[] = []

    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos]

      if (token.type === 'close') {
        if (nested) return entries
        this.pos++ // stray '}' at root level
        continue
      }

      if (token.type === 'open') {
        entries.push(this.parseBlock())
        continue
      }

      if (token.type === 'operator') {
        this.pos++ // stray operator
        continue
      }

      const key = toScalar(token)
      const next = this.tokens[this.pos + 1]
      if (next?.type !== 'operator') {
        entries.push(key)
        this.pos++
        continue
      }

      const valueToken = this.tokens[this.pos + 2]
      if (valueToken?.type === 'open') {
        this.pos += 2
        const block = this.parseBlock()
        entries.push({ kind: 'assignment', key, operator: next.text, value: block, start: key.start, end: block.end })
        continue
      }

      if (valueToken && (valueToken.type === 'word' || valueToken.type === 'string')) {
        const value = toScalar(valueToken)
        entries.push({ kind: 'assignment', key, operator: next.text, value, start: key.start, end: value.end })
        this.pos += 3
        continue
      }

      // `key =` followed by '}' or another operator: keep the key, drop the operator.
      entries.push(key)
      this.pos += 2
    }

    return entries
  }

  // Expects the current token to be '{'.
  private parseBlock(): ScriptBlock {
    const open = this.tokens[this.pos]
    this.pos++
    const entries = this.parseEntries(true)
    const close = this.tokens[this.pos]
    if (close?.type === 'close') {
      this.pos++
      return { kind: 'block', entries, start: open.start, end: close.end, closed: true, root: false }
    }
    return { kind: 'block', entries, start: open.start, end: this.source.length, closed: false, root: false }
  }
}

function toScalar(token: Token): ScriptScalar {
  return {
    kind: 'scalar',
    text: token.text,
    quoted: token.type === 'string',
    start: token.start,
    end: token.end
  }
}
