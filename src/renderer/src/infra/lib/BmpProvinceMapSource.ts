import { decodeBmp24, type DecodedBmp } from './decodeBmp24'
import type { ProvinceMapSource } from './ProvinceMapSource'

// Decodes raw provinces.bmp bytes straight via decodeBmp24, instead of
// blob → createImageBitmap → canvas drawImage/getImageData. That GPU/canvas
// round-trip was the actual cost of decoding (and could silently apply color
// management to province colors); decodeBmp24 is a pure, synchronous
// typed-array scan.
//
// The parsed result is cached by the source array (a WeakMap, so it never
// outlives the bytes themselves — no cache to invalidate when a new image
// replaces the old one) so loading the same image twice (useMapCanvas and
// useOverlayAssets both call this independently, from the same store value)
// only parses once. Each caller still gets its own copy of the pixel array:
// MapRenderer mutates its copy in place while painting, and callers must not
// see each other's edits through a shared buffer.
const decodeCache = new WeakMap<Uint8Array, DecodedBmp>()

export class BmpProvinceMapSource implements ProvinceMapSource {
  readonly width: number
  readonly height: number
  readonly pixelData: Uint8ClampedArray

  private constructor(width: number, height: number, pixelData: Uint8ClampedArray) {
    this.width     = width
    this.height    = height
    this.pixelData = pixelData
  }

  static async load(bytes: Uint8Array): Promise<BmpProvinceMapSource> {
    let decoded = decodeCache.get(bytes)
    if (!decoded) {
      decoded = decodeBmp24(bytes)
      decodeCache.set(bytes, decoded)
    }
    return new BmpProvinceMapSource(decoded.width, decoded.height, decoded.pixels.slice())
  }

  // No-op: kept so existing call sites (which used to close the decoded
  // ImageBitmap) don't need to change. There's no GL/bitmap resource to
  // release now that decoding no longer goes through createImageBitmap.
  dispose(): void {}
}
