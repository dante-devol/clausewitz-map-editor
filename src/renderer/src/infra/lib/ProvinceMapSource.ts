// Format-agnostic interface for a decoded province map image.
// Implementations handle format-specific loading; analysis code operates on this.
export interface ProvinceMapSource {
  readonly width: number
  readonly height: number
  // RGBA pixel data in row-major order, top-left origin.
  readonly pixelData: Uint8ClampedArray
  readonly imageBitmap: ImageBitmap
  dispose(): void
}
