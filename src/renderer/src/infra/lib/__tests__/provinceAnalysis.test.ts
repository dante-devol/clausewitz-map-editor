import { describe, expect, it } from 'vitest'
import { buildProvinceIndex, type PixelBuffer } from '../provinceAnalysis'

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

  // Regression / spec-pinning test for docs/code-review-2026-09.md 4.5: "the
  // painted-province index (bounding boxes, adjacency) goes stale after
  // painting, so selection outlines drift." MapRenderer.paintBrush and
  // revertBrushStroke mutate `idData` directly (so hit-testing/color lookup
  // stay correct) but never touch `bboxes`/`adjacency` — this test simulates
  // exactly that direct idData mutation and shows the stale bboxes/adjacency
  // diverge from what a fresh rebuild would produce. It should be updated (or
  // replaced by one asserting the corrected behavior) once painting
  // incrementally updates the index instead of leaving this gap.
  it('[known gap] bboxes and adjacency go stale when idData is mutated directly, as paintBrush does', () => {
    const original = bufferFromGrid([
      [RED, RED, GREEN],
      [RED, RED, GREEN]
    ])
    const index = buildProvinceIndex(original)
    const redId = index.colorToId.get(RED)!
    const greenId = index.colorToId.get(GREEN)!
    expect(index.bboxes.get(redId)).toEqual({ minX: 0, minY: 0, maxX: 1, maxY: 1 })

    // Simulate painting the right column of the red province green — exactly
    // the per-pixel idData mutation paintBrush performs, with no bbox/adjacency update.
    const paintedOffsets = [1, 4] // (x=1,y=0) and (x=1,y=1)
    for (const offset of paintedOffsets) index.idData[offset] = greenId

    // The red province visually shrank to a single column, but its recorded
    // bbox still claims the old two-column extent.
    expect(index.bboxes.get(redId)).toEqual({ minX: 0, minY: 0, maxX: 1, maxY: 1 })

    // What a correct index for the new pixel layout actually looks like:
    const rebuilt = buildProvinceIndex(bufferFromGrid([
      [RED, GREEN, GREEN],
      [RED, GREEN, GREEN]
    ]))
    expect(rebuilt.bboxes.get(redId)).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 1 })
    expect(rebuilt.bboxes.get(redId)).not.toEqual(index.bboxes.get(redId))
  })
})
