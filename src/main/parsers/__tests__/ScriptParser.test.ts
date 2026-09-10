import { describe, expect, it } from 'vitest'
import {
  assignmentsOf,
  bareNumbers,
  blockOf,
  findAssignmentDeep,
  firstAssignment,
  parseNumber,
  parseScript,
  scalarOf
} from '../script/ScriptParser'
import { ScriptEditor } from '../script/ScriptEditor'

describe('parseScript', () => {
  it('ignores braces and keys inside comments', () => {
    const doc = parseScript('a = {\n\t# b = { 1 2 }\n\tc = 3 # }\n}\nd = 4')
    const a = blockOf(firstAssignment(doc.root, 'a'))!
    expect(assignmentsOf(a).map((e) => e.key.text)).toEqual(['c'])
    expect(scalarOf(firstAssignment(doc.root, 'd'))).toBe('4')
  })

  it('keeps quoted strings intact, including # and braces', () => {
    const doc = parseScript('name = "A # not { a comment"')
    const name = firstAssignment(doc.root, 'name')!
    expect(name.value).toMatchObject({ kind: 'scalar', text: 'A # not { a comment', quoted: true })
  })

  it('parses signed numbers', () => {
    const doc = parseScript('temperature = { -20.0 +3 .5 }')
    expect(bareNumbers(blockOf(firstAssignment(doc.root, 'temperature'))!)).toEqual([-20, 3, 0.5])
    expect(parseNumber('abc')).toBeNull()
  })

  it('records comparison operators', () => {
    const doc = parseScript('limit = { num > 3 x != y }')
    const limit = blockOf(firstAssignment(doc.root, 'limit'))!
    expect(assignmentsOf(limit).map((e) => e.operator)).toEqual(['>', '!='])
  })

  it('tolerates an unclosed block and stray closing braces', () => {
    const doc = parseScript('} a = 1\nb = { c = 2')
    const b = blockOf(firstAssignment(doc.root, 'b'))!
    expect(b.closed).toBe(false)
    expect(scalarOf(firstAssignment(b, 'c'))).toBe('2')
  })

  it('finds nested assignments depth-first', () => {
    const doc = parseScript('outer = { inner = { target = yes } }')
    expect(scalarOf(findAssignmentDeep(doc.root, 'target'))).toBe('yes')
  })

  it('matches keys case-insensitively', () => {
    const doc = parseScript('IF = { x = 1 }')
    expect(firstAssignment(doc.root, 'if')).toBeDefined()
  })
})

describe('ScriptEditor', () => {
  const source = 'block = {\n\ta = 1\n\tb = 2 # note\n}\n'

  it('returns the source unchanged when there are no edits', () => {
    expect(new ScriptEditor(source).apply()).toBe(source)
  })

  it('removes whole lines, including a trailing comment', () => {
    const doc = parseScript(source)
    const block = blockOf(firstAssignment(doc.root, 'block'))!
    const editor = new ScriptEditor(source)
    editor.remove(firstAssignment(block, 'b')!)
    expect(editor.apply()).toBe('block = {\n\ta = 1\n}\n')
  })

  it('inserts with the indentation of sibling entries', () => {
    const doc = parseScript(source)
    const block = blockOf(firstAssignment(doc.root, 'block'))!
    const editor = new ScriptEditor(source)
    editor.insert(block, { kind: 'end' }, ['c = 3', 'd = {', '\te = 4', '}'])
    expect(editor.apply()).toBe('block = {\n\ta = 1\n\tb = 2 # note\n\tc = 3\n\td = {\n\t\te = 4\n\t}\n}\n')
  })

  it('keeps CRLF line endings', () => {
    const crlf = source.replace(/\n/g, '\r\n')
    const doc = parseScript(crlf)
    const block = blockOf(firstAssignment(doc.root, 'block'))!
    const editor = new ScriptEditor(crlf)
    editor.insert(block, { kind: 'after', entry: firstAssignment(block, 'a')! }, ['x = 9'])
    expect(editor.apply()).toBe('block = {\r\n\ta = 1\r\n\tx = 9\r\n\tb = 2 # note\r\n}\r\n')
  })

  it('applies an insertion before a removal at the same position', () => {
    const doc = parseScript(source)
    const block = blockOf(firstAssignment(doc.root, 'block'))!
    const a = firstAssignment(block, 'a')!
    const editor = new ScriptEditor(source)
    editor.remove(a)
    editor.insert(block, { kind: 'before', entry: a }, ['z = 0'])
    expect(editor.apply()).toBe('block = {\n\tz = 0\n\tb = 2 # note\n}\n')
  })

  it('rejects overlapping edits', () => {
    const editor = new ScriptEditor(source)
    editor.replace(0, 10, 'x')
    editor.replace(5, 12, 'y')
    expect(() => editor.apply()).toThrow(/Overlapping/)
  })
})
