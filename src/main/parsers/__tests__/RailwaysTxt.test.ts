import { describe, expect, it } from 'vitest'
import { RailwaysTxt } from '../RailwaysTxt'

const CONTENT = `3 4 6521 11444 3312 6282
2 5 6282 349 3340 9388 321
1 3 6332 11245 6375
`

describe('RailwaysTxt.parse', () => {
  it('parses level, count and the province chain', () => {
    expect(RailwaysTxt.parse(CONTENT)).toEqual([
      { level: 3, provinceIds: [6521, 11444, 3312, 6282] },
      { level: 2, provinceIds: [6282, 349, 3340, 9388, 321] },
      { level: 1, provinceIds: [6332, 11245, 6375] }
    ])
  })

  it('truncates to the declared count if there are extra trailing numbers', () => {
    expect(RailwaysTxt.parse('1 2 100 200 300\n')).toEqual([{ level: 1, provinceIds: [100, 200] }])
  })

  it('ignores blank lines and returns an empty list for empty content', () => {
    expect(RailwaysTxt.parse('\n\n')).toEqual([])
    expect(RailwaysTxt.parse('')).toEqual([])
  })

  it('skips a line with fewer than 3 numbers', () => {
    expect(RailwaysTxt.parse('1 2\n')).toEqual([])
  })
})
