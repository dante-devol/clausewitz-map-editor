import { describe, expect, it } from 'vitest'
import { SupplyNodesTxt } from '../SupplyNodesTxt'

const CONTENT = `1 67
1 101
1 121
`

describe('SupplyNodesTxt.parse', () => {
  it('parses one level/province pair per line', () => {
    expect(SupplyNodesTxt.parse(CONTENT)).toEqual([
      { level: 1, provinceId: 67 },
      { level: 1, provinceId: 101 },
      { level: 1, provinceId: 121 }
    ])
  })

  it('ignores blank lines', () => {
    expect(SupplyNodesTxt.parse('1 67\n\n1 101\n')).toHaveLength(2)
  })

  it('returns an empty list for empty content', () => {
    expect(SupplyNodesTxt.parse('')).toEqual([])
  })

  it('skips a malformed line', () => {
    expect(SupplyNodesTxt.parse('1 67\nnot a line\n1 101\n')).toEqual([
      { level: 1, provinceId: 67 },
      { level: 1, provinceId: 101 }
    ])
  })
})
