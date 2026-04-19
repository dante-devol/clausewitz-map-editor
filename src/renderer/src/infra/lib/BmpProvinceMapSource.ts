import type { ProvinceMapSource } from './ProvinceMapSource'

export class BmpProvinceMapSource implements ProvinceMapSource {
  readonly width: number
  readonly height: number
  readonly pixelData: Uint8ClampedArray
  readonly imageBitmap: ImageBitmap

  private constructor(bitmap: ImageBitmap, pixelData: Uint8ClampedArray) {
    this.width       = bitmap.width
    this.height      = bitmap.height
    this.imageBitmap = bitmap
    this.pixelData   = pixelData
  }

  static async load(src: string): Promise<BmpProvinceMapSource> {
    const blob   = await fetch(src).then(r => r.blob())
    const bitmap = await createImageBitmap(blob)
    const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx2d     = offscreen.getContext('2d')!
    ctx2d.drawImage(bitmap, 0, 0)
    const { data } = ctx2d.getImageData(0, 0, bitmap.width, bitmap.height)
    return new BmpProvinceMapSource(bitmap, data)
  }

  dispose(): void {
    this.imageBitmap.close()
  }
}
