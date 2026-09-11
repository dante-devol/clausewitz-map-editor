import { describe, expect, it } from 'vitest'
import { BmpProvinceMapSource } from '../BmpProvinceMapSource'
import { encodeBmp24 } from './bmpTestFixtures'

function toDataUrl(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:image/bmp;base64,${btoa(binary)}`
}

describe('BmpProvinceMapSource', () => {
  it('decodes the correct pixels from a data URL', async () => {
    const bytes = encodeBmp24(2, 1, (x) => (x === 0 ? [200, 10, 10] : [10, 200, 10]))
    const source = await BmpProvinceMapSource.load(toDataUrl(bytes))
    expect(source.width).toBe(2)
    expect(source.height).toBe(1)
    expect(Array.from(source.pixelData.slice(0, 4))).toEqual([200, 10, 10, 255])
    expect(Array.from(source.pixelData.slice(4, 8))).toEqual([10, 200, 10, 255])
  })

  // The decode cache exists so loading the same image twice (useMapCanvas
  // and useOverlayAssets both call this independently) only parses once —
  // but MapRenderer mutates its pixelData in place while painting, so each
  // caller must get an independent array, never a shared reference into the
  // cache or into another caller's copy.
  it('gives each load() call its own independent pixelData array, even for the same source', async () => {
    const url = toDataUrl(encodeBmp24(1, 1, () => [1, 2, 3]))
    const first = await BmpProvinceMapSource.load(url)
    const second = await BmpProvinceMapSource.load(url)

    expect(first.pixelData).not.toBe(second.pixelData)
    expect(Array.from(second.pixelData)).toEqual(Array.from(first.pixelData))

    first.pixelData[0] = 255
    expect(second.pixelData[0]).toBe(1) // unaffected by the mutation above
  })

  it('decodes distinct sources independently', async () => {
    const a = await BmpProvinceMapSource.load(toDataUrl(encodeBmp24(1, 1, () => [9, 9, 9])))
    const b = await BmpProvinceMapSource.load(toDataUrl(encodeBmp24(1, 1, () => [4, 4, 4])))
    expect(Array.from(a.pixelData.slice(0, 3))).toEqual([9, 9, 9])
    expect(Array.from(b.pixelData.slice(0, 3))).toEqual([4, 4, 4])
  })
})
