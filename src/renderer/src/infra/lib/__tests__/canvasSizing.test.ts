import { describe, expect, it } from 'vitest'
import { computeCanvasBackingSize } from '../canvasSizing'

describe('computeCanvasBackingSize', () => {
  it('leaves the backing store equal to the CSS size at devicePixelRatio 1', () => {
    expect(computeCanvasBackingSize(800, 600, 1)).toEqual({ width: 800, height: 600 })
  })

  it('scales the backing store by devicePixelRatio, independent of CSS size', () => {
    expect(computeCanvasBackingSize(800, 600, 2)).toEqual({ width: 1600, height: 1200 })
  })

  it('rounds a fractional devicePixelRatio to whole device pixels', () => {
    expect(computeCanvasBackingSize(801, 601, 1.5)).toEqual({ width: 1202, height: 902 })
  })

  it('never produces a zero-size backing store, even for a collapsed container', () => {
    expect(computeCanvasBackingSize(0, 0, 2)).toEqual({ width: 1, height: 1 })
  })

  it('treats a non-positive devicePixelRatio as 1 (defensive default)', () => {
    expect(computeCanvasBackingSize(800, 600, 0)).toEqual({ width: 800, height: 600 })
  })
})
