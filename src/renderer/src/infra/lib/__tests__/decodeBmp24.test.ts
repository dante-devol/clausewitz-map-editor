import { describe, expect, it } from 'vitest'
import { decodeBmp24 } from '../decodeBmp24'
import { encodeBmp24 } from './bmpTestFixtures'

const RED = [200, 10, 10] as const
const GREEN = [10, 200, 10] as const
const BLUE = [10, 10, 200] as const

function pixelAt(decoded: ReturnType<typeof decodeBmp24>, x: number, y: number): [number, number, number, number] {
  const i = (y * decoded.width + x) * 4
  return [decoded.pixels[i], decoded.pixels[i + 1], decoded.pixels[i + 2], decoded.pixels[i + 3]]
}

describe('decodeBmp24', () => {
  it('decodes a single-pixel bottom-up BMP (the default BMP storage direction)', () => {
    const bytes = encodeBmp24(1, 1, () => RED)
    const decoded = decodeBmp24(bytes)
    expect(decoded.width).toBe(1)
    expect(decoded.height).toBe(1)
    expect(pixelAt(decoded, 0, 0)).toEqual([...RED, 255])
  })

  it('decodes a top-down BMP (negative height) identically to the equivalent bottom-up one', () => {
    const getPixel = (x: number, y: number) => (x === 0 && y === 0 ? RED : x === 1 && y === 0 ? GREEN : BLUE)
    const bottomUp = decodeBmp24(encodeBmp24(2, 2, getPixel, { topDown: false }))
    const topDown = decodeBmp24(encodeBmp24(2, 2, getPixel, { topDown: true }))
    expect(topDown.pixels).toEqual(bottomUp.pixels)
  })

  it('preserves (x, y) orientation: row 0 is the top of the image regardless of storage direction', () => {
    // Distinct colors per row so a row-order mixup (a very easy BMP bug) fails loudly.
    const getPixel = (_x: number, y: number) => (y === 0 ? RED : GREEN)
    for (const topDown of [false, true]) {
      const decoded = decodeBmp24(encodeBmp24(1, 2, getPixel, { topDown }))
      expect(pixelAt(decoded, 0, 0)).toEqual([...RED, 255])
      expect(pixelAt(decoded, 0, 1)).toEqual([...GREEN, 255])
    }
  })

  it('handles row padding for a width that is not a multiple of 4 pixels', () => {
    // width=3 at 24bpp -> 9 bytes/row, padded to 12: this is exactly the case
    // the row-size formula (not just width * 3) has to get right.
    const colors = [RED, GREEN, BLUE]
    const getPixel = (x: number) => colors[x]
    const decoded = decodeBmp24(encodeBmp24(3, 1, getPixel))
    expect(pixelAt(decoded, 0, 0)).toEqual([...RED, 255])
    expect(pixelAt(decoded, 1, 0)).toEqual([...GREEN, 255])
    expect(pixelAt(decoded, 2, 0)).toEqual([...BLUE, 255])
  })

  it('round-trips a larger grid of distinct colors at the correct (x, y) for each', () => {
    const width = 10
    const height = 7
    const getPixel = (x: number, y: number): [number, number, number] => [x * 20, y * 20, 128]
    const decoded = decodeBmp24(encodeBmp24(width, height, getPixel))
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        expect(pixelAt(decoded, x, y)).toEqual([x * 20, y * 20, 128, 255])
      }
    }
  })

  it('rejects a non-BMP buffer', () => {
    expect(() => decodeBmp24(new Uint8Array([0, 1, 2, 3]))).toThrow(/not a BMP/)
  })

  it('rejects a compressed BMP', () => {
    const bytes = encodeBmp24(1, 1, () => RED)
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    view.setUint32(30, 1, true) // BI_RLE8, unsupported
    expect(() => decodeBmp24(bytes)).toThrow(/compression/)
  })

  it('rejects a non-24bpp BMP', () => {
    const bytes = encodeBmp24(1, 1, () => RED)
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    view.setUint16(28, 32, true)
    expect(() => decodeBmp24(bytes)).toThrow(/bit depth/)
  })
})
