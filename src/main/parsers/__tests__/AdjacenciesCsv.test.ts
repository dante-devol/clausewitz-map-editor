import { describe, expect, it } from 'vitest'
import { AdjacenciesCsv } from '../AdjacenciesCsv'

// Header plus real rows from the vanilla file.
const CONTENT = `From;To;Type;Through;start_x;start_y;stop_x;stop_y;adjacency_rule_name;Comment
12251;10321;sea;8313;-1;-1;-1;-1;;Andaman
7413;1419;sea;5294;-1;-1;-1;-1;;Moluccas
480;9431;sea;8621;-1;-1;-1;-1;;Netherlands outlier
`

describe('AdjacenciesCsv.parse', () => {
  it('skips the header row', () => {
    expect(AdjacenciesCsv.parse(CONTENT)).toHaveLength(3)
  })

  it('parses a sea crossing with a through-province and no drawn line', () => {
    const [first] = AdjacenciesCsv.parse(CONTENT)
    expect(first).toEqual({
      from: 12251,
      to: 10321,
      type: 'sea',
      through: 8313,
      startX: null,
      startY: null,
      stopX: null,
      stopY: null,
      adjacencyRuleName: undefined,
      comment: 'Andaman'
    })
  })

  it('maps -1 coordinates/through to null rather than -1', () => {
    const [first] = AdjacenciesCsv.parse(CONTENT)
    expect(first.through).not.toBe(-1)
    expect(first.startX).toBeNull()
  })

  it('reads an adjacency_rule_name when present', () => {
    const withRule = 'From;To;Type;Through;start_x;start_y;stop_x;stop_y;adjacency_rule_name;Comment\n1;2;sea;-1;-1;-1;-1;-1;SUEZ_CANAL;Suez\n'
    const [entry] = AdjacenciesCsv.parse(withRule)
    expect(entry.adjacencyRuleName).toBe('SUEZ_CANAL')
    expect(entry.through).toBeNull()
  })

  it('ignores blank lines and returns an empty list for empty content', () => {
    expect(AdjacenciesCsv.parse('\n\n')).toEqual([])
    expect(AdjacenciesCsv.parse('')).toEqual([])
  })
})
