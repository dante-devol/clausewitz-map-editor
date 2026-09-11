import { describe, expect, it } from 'vitest'
import { buildProvinceIndex, updateProvinceBboxesForRegion, type PixelBuffer } from '../provinceAnalysis'

// Builds an RGBA PixelBuffer from a grid of packed 0xRRGGBB colors (or null
// for a fully-transparent/unmapped pixel), row 0 = top.
function bufferFromGrid(grid: (number | null)[][]): PixelBuffer {
  const height = grid.length
  const width = grid[0].length
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = grid[y][x]
      const i = (y * width + x) * 4
      if (color === null) continue // alpha stays 0
      data[i] = (color >> 16) & 0xff
      data[i + 1] = (color >> 8) & 0xff
      data[i + 2] = color & 0xff
      data[i + 3] = 255
    }
  }
  return { data, width, height }
}

const RED = 0xcc1010
const GREEN = 0x10cc10
const BLUE = 0x1010cc

describe('buildProvinceIndex', () => {
  it('assigns sequential ids in first-seen order and maps colors both ways', () => {
    const index = buildProvinceIndex(bufferFromGrid([
      [RED, GREEN],
      [BLUE, RED]
    ]))
    expect(index.provinceCount).toBe(3)
    expect(index.colorToId.get(RED)).toBe(1)
    expect(index.colorToId.get(GREEN)).toBe(2)
    expect(index.colorToId.get(BLUE)).toBe(3)
    expect(Array.from(index.idData)).toEqual([1, 2, 3, 1])
  })

  it('treats fully-transparent pixels as unmapped (id 0), excluded from provinces', () => {
    const index = buildProvinceIndex(bufferFromGrid([[RED, null]]))
    expect(index.idData[1]).toBe(0)
    expect(index.provinceCount).toBe(1)
    expect(index.bboxes.has(0)).toBe(false)
  })

  it('computes a tight bounding box per province', () => {
    const index = buildProvinceIndex(bufferFromGrid([
      [RED, RED, GREEN],
      [RED, GREEN, GREEN],
      [BLUE, BLUE, GREEN]
    ]))
    const redId = index.colorToId.get(RED)!
    const greenId = index.colorToId.get(GREEN)!
    expect(index.bboxes.get(redId)).toEqual({ minX: 0, minY: 0, maxX: 1, maxY: 1 })
    expect(index.bboxes.get(greenId)).toEqual({ minX: 1, minY: 0, maxX: 2, maxY: 2 })
  })

  it('records adjacency symmetrically for provinces sharing a border pixel', () => {
    const index = buildProvinceIndex(bufferFromGrid([[RED, GREEN, BLUE]]))
    const [redId, greenId, blueId] = [RED, GREEN, BLUE].map((c) => index.colorToId.get(c)!)
    expect(index.adjacency.get(redId)).toEqual(new Set([greenId]))
    expect(index.adjacency.get(greenId)).toEqual(new Set([redId, blueId]))
    expect(index.adjacency.get(blueId)).toEqual(new Set([greenId]))
  })

  it('does not record adjacency across an unmapped (transparent) gap', () => {
    const index = buildProvinceIndex(bufferFromGrid([[RED, null, GREEN]]))
    const redId = index.colorToId.get(RED)!
    const greenId = index.colorToId.get(GREEN)!
    expect(index.adjacency.get(redId) ?? new Set()).not.toContain(greenId)
  })

})

// docs/code-review-2026-09.md 4.5: "the painted-province index (bounding
// boxes, adjacency) goes stale after painting, so selection outlines drift."
// MapRenderer.paintBrush/revertBrushStroke mutate `idData` directly (so
// hit-testing/color lookup stay correct) and now also call this to keep
// `bboxes` correct, without a full-image rescan — see its doc comment for
// why scanning old-bbox-union-changed-region is exact.
describe('updateProvinceBboxesForRegion', () => {
  it('shrinks a province bbox when it loses pixels on its edge', () => {
    const index = buildProvinceIndex(bufferFromGrid([
      [RED, RED, GREEN],
      [RED, RED, GREEN]
    ]))
    const redId = index.colorToId.get(RED)!
    const greenId = index.colorToId.get(GREEN)!
    expect(index.bboxes.get(redId)).toEqual({ minX: 0, minY: 0, maxX: 1, maxY: 1 })

    // Repaint the right red column green — exactly the idData mutation
    // paintBrush performs.
    const paintedOffsets = [1, 4] // (x=1,y=0) and (x=1,y=1)
    for (const offset of paintedOffsets) index.idData[offset] = greenId

    updateProvinceBboxesForRegion(index, 3, 2, new Set([redId, greenId]), { minX: 1, minY: 0, maxX: 1, maxY: 1 })

    const rebuilt = buildProvinceIndex(bufferFromGrid([
      [RED, GREEN, GREEN],
      [RED, GREEN, GREEN]
    ]))
    expect(index.bboxes.get(redId)).toEqual(rebuilt.bboxes.get(redId))
    expect(index.bboxes.get(greenId)).toEqual(rebuilt.bboxes.get(greenId))
  })

  it('grows a province bbox when it gains pixels beyond its old extent', () => {
    const index = buildProvinceIndex(bufferFromGrid([[RED, GREEN, GREEN]]))
    const redId = index.colorToId.get(RED)!
    const greenId = index.colorToId.get(GREEN)!
    expect(index.bboxes.get(greenId)).toEqual({ minX: 1, minY: 0, maxX: 2, maxY: 0 })

    index.idData[0] = greenId // paint the red pixel green
    updateProvinceBboxesForRegion(index, 3, 1, new Set([redId, greenId]), { minX: 0, minY: 0, maxX: 0, maxY: 0 })

    expect(index.bboxes.get(greenId)).toEqual({ minX: 0, minY: 0, maxX: 2, maxY: 0 })
  })

  it('removes the bbox entry for a province painted over completely', () => {
    const index = buildProvinceIndex(bufferFromGrid([[RED, GREEN]]))
    const redId = index.colorToId.get(RED)!
    const greenId = index.colorToId.get(GREEN)!

    index.idData[0] = greenId
    updateProvinceBboxesForRegion(index, 2, 1, new Set([redId, greenId]), { minX: 0, minY: 0, maxX: 0, maxY: 0 })

    expect(index.bboxes.has(redId)).toBe(false)
    expect(index.bboxes.get(greenId)).toEqual({ minX: 0, minY: 0, maxX: 1, maxY: 0 })
  })

  it('is a no-op for ids not in affectedIds', () => {
    const index = buildProvinceIndex(bufferFromGrid([[RED, GREEN, BLUE]]))
    const blueId = index.colorToId.get(BLUE)!
    const before = index.bboxes.get(blueId)
    updateProvinceBboxesForRegion(index, 3, 1, new Set([index.colorToId.get(RED)!]), { minX: 0, minY: 0, maxX: 0, maxY: 0 })
    expect(index.bboxes.get(blueId)).toEqual(before)
  })
})
