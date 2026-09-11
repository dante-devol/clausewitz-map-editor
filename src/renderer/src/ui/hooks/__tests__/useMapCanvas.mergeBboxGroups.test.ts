import { describe, expect, it } from 'vitest'
import { mergeCollidingBboxGroups } from '../useMapCanvas'

describe('mergeCollidingBboxGroups', () => {
  it('leaves non-overlapping groups separate', () => {
    const groups = [
      { minX: 0, minY: 0, maxX: 5, maxY: 5 },
      { minX: 100, minY: 100, maxX: 105, maxY: 105 }
    ]
    expect(mergeCollidingBboxGroups(groups, 1)).toHaveLength(2)
  })

  it('merges two directly overlapping groups into their union', () => {
    const groups = [
      { minX: 0, minY: 0, maxX: 5, maxY: 5 },
      { minX: 3, minY: 3, maxX: 10, maxY: 10 }
    ]
    const result = mergeCollidingBboxGroups(groups, 1)
    expect(result).toEqual([{ minX: 0, minY: 0, maxX: 10, maxY: 10 }])
  })

  it('merges transitively through a chain of overlaps', () => {
    const groups = [
      { minX: 0, minY: 0, maxX: 5, maxY: 5 },
      { minX: 4, minY: 0, maxX: 9, maxY: 5 },
      { minX: 8, minY: 0, maxX: 13, maxY: 5 }
    ]
    const result = mergeCollidingBboxGroups(groups, 1)
    expect(result).toEqual([{ minX: 0, minY: 0, maxX: 13, maxY: 5 }])
  })

  it('does not merge two chains that never overlap the same group', () => {
    const groups = [
      { minX: 0, minY: 0, maxX: 5, maxY: 5 },
      { minX: 4, minY: 0, maxX: 9, maxY: 5 },
      { minX: 100, minY: 100, maxX: 105, maxY: 105 },
      { minX: 104, minY: 100, maxX: 109, maxY: 105 }
    ]
    const result = mergeCollidingBboxGroups(groups, 1)
    expect(result).toHaveLength(2)
  })

  it('skips merging above the group cap and returns the groups unchanged', () => {
    const groups = Array.from({ length: 301 }, (_, i) => ({ minX: i, minY: 0, maxX: i, maxY: 0 }))
    const result = mergeCollidingBboxGroups(groups, 1)
    expect(result).toHaveLength(301)
  })
})
