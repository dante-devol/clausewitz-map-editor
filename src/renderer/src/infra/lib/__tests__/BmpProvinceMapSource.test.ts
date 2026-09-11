import { describe, expect, it } from 'vitest'
import { BmpProvinceMapSource } from '../BmpProvinceMapSource'
import { encodeBmp24 } from './bmpTestFixtures'

describe('BmpProvinceMapSource', () => {
  it('decodes the correct pixels from raw bytes', async () => {
    const bytes = encodeBmp24(2, 1, (x) => (x === 0 ? [200, 10, 10] : [10, 200, 10]))
    const source = await BmpProvinceMapSource.load(bytes)
    expect(source.width).toBe(2)
    expect(source.height).toBe(1)
    expect(Array.from(source.pixelData.slice(0, 4))).toEqual([200, 10, 10, 255])
    expect(Array.from(source.pixelData.slice(4, 8))).toEqual([10, 200, 10, 255])
  })

  // The decode cache exists so loading the same image twice (useMapCanvas
  // and useOverlayAssets both call this independently, from the same store
  // value) only parses once — but MapRenderer mutates its pixelData in place
  // while painting, so each caller must get an independent array, never a
  // shared reference into the cache or into another caller's copy.
  it('gives each load() call its own independent pixelData array, even for the same source', async () => {
    const bytes = encodeBmp24(1, 1, () => [1, 2, 3])
    const first = await BmpProvinceMapSource.load(bytes)
    const second = await BmpProvinceMapSource.load(bytes)

    expect(first.pixelData).not.toBe(second.pixelData)
    expect(Array.from(second.pixelData)).toEqual(Array.from(first.pixelData))

    first.pixelData[0] = 255
    expect(second.pixelData[0]).toBe(1) // unaffected by the mutation above
  })

  it('decodes distinct sources independently', async () => {
    const a = await BmpProvinceMapSource.load(encodeBmp24(1, 1, () => [9, 9, 9]))
    const b = await BmpProvinceMapSource.load(encodeBmp24(1, 1, () => [4, 4, 4]))
    expect(Array.from(a.pixelData.slice(0, 3))).toEqual([9, 9, 9])
    expect(Array.from(b.pixelData.slice(0, 3))).toEqual([4, 4, 4])
  })

  it('two different Uint8Array instances with identical bytes are not confused by the cache', async () => {
    // The cache keys on array identity (WeakMap), not byte content — a copy
    // of the same bytes must decode independently, not collide in the cache.
    const bytesA = encodeBmp24(1, 1, () => [7, 7, 7])
    const bytesB = bytesA.slice()
    const a = await BmpProvinceMapSource.load(bytesA)
    const b = await BmpProvinceMapSource.load(bytesB)
    expect(Array.from(a.pixelData.slice(0, 3))).toEqual([7, 7, 7])
    expect(Array.from(b.pixelData.slice(0, 3))).toEqual([7, 7, 7])
  })
})
