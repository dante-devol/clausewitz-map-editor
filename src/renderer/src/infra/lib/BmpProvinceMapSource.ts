import { decodeBmp24FromBase64, type DecodedBmp } from './decodeBmp24'
import type { ProvinceMapSource } from './ProvinceMapSource'

// Decodes a `data:image/bmp;base64,...` URL straight from its bytes via
// decodeBmp24, instead of fetch → blob → createImageBitmap → canvas
// drawImage/getImageData. That GPU/canvas round-trip was the actual cost of
// decoding (and could silently apply color management to province colors);
// decodeBmp24FromBase64 is a pure, synchronous typed-array scan.
//
// The parsed bytes are cached by source string so loading the same image
// twice (useMapCanvas and useOverlayAssets both call this independently)
// only parses once. Each caller still gets its own copy of the pixel array:
// MapRenderer mutates its copy in place while painting, and callers must not
// see each other's edits through a shared buffer.
const decodeCache = new Map<string, DecodedBmp>()

export class BmpProvinceMapSource implements ProvinceMapSource {
  readonly width: number
  readonly height: number
  readonly pixelData: Uint8ClampedArray

  private constructor(width: number, height: number, pixelData: Uint8ClampedArray) {
    this.width     = width
    this.height    = height
    this.pixelData = pixelData
  }

  static async load(src: string): Promise<BmpProvinceMapSource> {
    let decoded = decodeCache.get(src)
    if (!decoded) {
      decoded = decodeBmp24FromBase64(src)
      decodeCache.set(src, decoded)
    }
    return new BmpProvinceMapSource(decoded.width, decoded.height, decoded.pixels.slice())
  }

  // No-op: kept so existing call sites (which used to close the decoded
  // ImageBitmap) don't need to change. There's no GL/bitmap resource to
  // release now that decoding no longer goes through createImageBitmap.
  dispose(): void {}
}
