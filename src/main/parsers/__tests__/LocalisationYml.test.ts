import { describe, expect, it } from 'vitest'
import { LocalisationYml } from '../LocalisationYml'

const LOC_FILE = `l_english:
 STATE_900:0 "Corsica"
 STATE_900_NAME:0 "Corsica"
 STRATEGICREGION_77:0 "Home Waters"
 UNRELATED_KEY:0 "Something else entirely"
 ESCAPED_KEY:0 "Line with \\"quotes\\" and a \\n escape"
`

describe('LocalisationYml.parse', () => {
  it('returns only the requested keys', () => {
    const entries = LocalisationYml.parse(LOC_FILE, new Set(['STATE_900', 'STRATEGICREGION_77']))
    expect(entries).toEqual([
      { key: 'STATE_900', value: 'Corsica' },
      { key: 'STRATEGICREGION_77', value: 'Home Waters' }
    ])
  })

  it('ignores keys not in the needed set', () => {
    const entries = LocalisationYml.parse(LOC_FILE, new Set(['STATE_900']))
    expect(entries.map((e) => e.key)).toEqual(['STATE_900'])
  })

  it('unescapes quotes and backslash escapes', () => {
    const entries = LocalisationYml.parse(LOC_FILE, new Set(['ESCAPED_KEY']))
    expect(entries[0].value).toBe('Line with "quotes" and a n escape')
  })

  it('returns nothing for an empty needed-key set', () => {
    expect(LocalisationYml.parse(LOC_FILE, new Set())).toEqual([])
  })

  it('stops scanning once every needed key is found', () => {
    // A malformed trailing line would break parsing if it were ever reached.
    const withTrap = LOC_FILE + ' TRAP:0 "unterminated'
    const entries = LocalisationYml.parse(withTrap, new Set(['STATE_900']))
    expect(entries).toEqual([{ key: 'STATE_900', value: 'Corsica' }])
  })

  it('handles a key with no matching entry', () => {
    const entries = LocalisationYml.parse(LOC_FILE, new Set(['DOES_NOT_EXIST']))
    expect(entries).toEqual([])
  })
})
