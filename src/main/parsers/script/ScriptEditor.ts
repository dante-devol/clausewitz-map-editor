import type { ScriptAssignment, ScriptBlock, ScriptEntry } from './ScriptParser'

// Where new lines go inside a block.
export type InsertPoint =
  | { kind: 'start' }
  | { kind: 'end' }
  | { kind: 'before'; entry: ScriptEntry }
  | { kind: 'after'; entry: ScriptEntry }

interface TextEdit {
  start: number
  end: number
  text: string
  seq: number
}

// Collects span-based edits against the original source and applies them in
// one pass. Everything outside the edited spans is kept byte-for-byte.
//
// Inserted content is given as lines. A leading '\t' on a line means one level
// deeper than the surrounding entries; indentation and line endings are taken
// from the file being edited.
export class ScriptEditor {
  readonly eol: string
  private readonly edits: TextEdit[] = []

  constructor(readonly source: string) {
    this.eol = source.includes('\r\n') ? '\r\n' : '\n'
  }

  get hasEdits(): boolean {
    return this.edits.length > 0
  }

  replace(start: number, end: number, text: string): void {
    this.edits.push({ start, end, text, seq: this.edits.length })
  }

  replaceValue(entry: ScriptAssignment, text: string): void {
    this.replace(entry.value.start, entry.value.end, text)
  }

  // Removes an entry. When it sits on its own line (optionally followed by a
  // comment) the whole line goes; otherwise only the entry and trailing spaces.
  remove(entry: ScriptEntry): void {
    const src = this.source
    const lineStart = lineStartOf(src, entry.start)
    const lineEnd = lineEndOf(src, entry.end)
    if (isBlank(src.slice(lineStart, entry.start)) && isBlankOrComment(src.slice(entry.end, lineEnd))) {
      this.replace(lineStart, lineEnd < src.length ? lineEnd + 1 : lineEnd, '')
      return
    }
    let end = entry.end
    while (end < src.length && (src[end] === ' ' || src[end] === '\t')) end++
    this.replace(entry.start, end, '')
  }

  insert(block: ScriptBlock, at: InsertPoint, lines: string[]): void {
    if (lines.length === 0) return
    const src = this.source

    if (at.kind === 'before') {
      const lineStart = lineStartOf(src, at.entry.start)
      const prefix = src.slice(lineStart, at.entry.start)
      if (isBlank(prefix)) this.replace(lineStart, lineStart, this.formatLines(lines, prefix))
      else this.replace(at.entry.start, at.entry.start, inline(lines) + ' ')
      return
    }

    if (at.kind === 'after') {
      const lineEnd = lineEndOf(src, at.entry.end)
      if (!isBlankOrComment(src.slice(at.entry.end, lineEnd))) {
        this.replace(at.entry.end, at.entry.end, ' ' + inline(lines))
        return
      }
      const indent = indentOf(src, at.entry.start)
      if (lineEnd < src.length) {
        this.replace(lineEnd + 1, lineEnd + 1, this.formatLines(lines, indent))
      } else {
        this.replace(src.length, src.length, this.eol + this.formatLines(lines, indent).slice(0, -this.eol.length))
      }
      return
    }

    if (at.kind === 'start') {
      if (block.root) {
        this.replace(0, 0, this.formatLines(lines, ''))
        return
      }
      const afterBrace = block.start + 1
      const lineEnd = lineEndOf(src, afterBrace)
      if (lineEnd < src.length && isBlankOrComment(src.slice(afterBrace, lineEnd))) {
        this.replace(lineEnd + 1, lineEnd + 1, this.formatLines(lines, this.childIndent(block)))
      } else {
        this.replace(afterBrace, afterBrace, ' ' + inline(lines))
      }
      return
    }

    // at.kind === 'end'
    if (!block.closed) {
      const needsEol = src.length > 0 && !src.endsWith('\n')
      const indent = block.root ? '' : this.childIndent(block)
      this.replace(src.length, src.length, (needsEol ? this.eol : '') + this.formatLines(lines, indent))
      return
    }
    const close = block.end - 1
    const lineStart = lineStartOf(src, close)
    if (isBlank(src.slice(lineStart, close))) {
      this.replace(lineStart, lineStart, this.formatLines(lines, this.childIndent(block)))
    } else {
      this.replace(close, close, ' ' + inline(lines) + ' ')
    }
  }

  apply(): string {
    const src = this.source
    // Ascending by position. At the same position, insertions (in the order
    // they were requested) come before a range replacement that starts there.
    const sorted = [...this.edits].sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start
      const aInsert = a.end === a.start
      const bInsert = b.end === b.start
      if (aInsert !== bInsert) return aInsert ? -1 : 1
      return a.seq - b.seq
    })

    let out = ''
    let cursor = 0
    let previous: TextEdit | null = null
    for (const edit of sorted) {
      if (previous && edit.start === previous.start && edit.end === previous.end && edit.end > edit.start && edit.text === previous.text) {
        continue // identical range edit requested twice
      }
      if (edit.start < cursor) {
        throw new Error(`Overlapping script edits at offset ${edit.start}`)
      }
      out += src.slice(cursor, edit.start) + edit.text
      cursor = Math.max(cursor, edit.end)
      previous = edit
    }
    return out + src.slice(cursor)
  }

  // Indentation used by a block's children: taken from the first child that
  // starts its own line, otherwise one tab deeper than the line opening the block.
  childIndent(block: ScriptBlock): string {
    const src = this.source
    for (const entry of block.entries) {
      const lineStart = lineStartOf(src, entry.start)
      const prefix = src.slice(lineStart, entry.start)
      if (isBlank(prefix) && lineStart > block.start) return prefix
    }
    return indentOf(src, block.start) + '\t'
  }

  private formatLines(lines: string[], indent: string): string {
    return lines.map((line) => indent + line + this.eol).join('')
  }
}

function lineStartOf(src: string, index: number): number {
  return src.lastIndexOf('\n', index - 1) + 1
}

// Index of the '\n' ending the line containing `index`, or the source length.
function lineEndOf(src: string, index: number): number {
  const newline = src.indexOf('\n', index)
  return newline === -1 ? src.length : newline
}

function indentOf(src: string, index: number): string {
  const lineStart = lineStartOf(src, index)
  const match = /^[ \t]*/.exec(src.slice(lineStart, index))
  return match ? match[0] : ''
}

function isBlank(text: string): boolean {
  return text.trim() === ''
}

function isBlankOrComment(text: string): boolean {
  const trimmed = text.trim()
  return trimmed === '' || trimmed.startsWith('#')
}

function inline(lines: string[]): string {
  return lines.map((line) => line.trim()).join(' ')
}

// ─── Value formatting ───────────────────────────────────────────────────────

export function formatNumber(value: number): string {
  return String(value)
}

// Weather values are conventionally written with a decimal point.
export function formatFloat(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value)
}

export function quoteString(value: string): string {
  return `"${value}"`
}

// Writes identifiers bare, anything else quoted.
export function formatScalarString(value: string): string {
  return /^[A-Za-z0-9_.:@\-]+$/.test(value) ? value : quoteString(value)
}
