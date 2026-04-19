import { vec2 } from 'gl-matrix'

export interface PixelBuffer {
  readonly data: Uint8ClampedArray
  readonly width: number
  readonly height: number
}

export interface ProvinceIndex {
  // Per-pixel province IDs, same dimensions as source image (row-major).
  readonly idData: Uint16Array
  // Maps packed RGB (0xRRGGBB) → sequential province ID (1-based; 0 = unmapped).
  readonly colorToId: Map<number, number>
  readonly provinceCount: number
}

export interface EdgeMaskResult {
  readonly canvas: OffscreenCanvas
  readonly provincePixels: number
  // Center of mass in image-space coords, or null for empty/missing province.
  readonly centroid: { x: number; y: number } | null
}

// Scans the pixel buffer once and assigns a sequential uint16 ID to each
// unique RGB color. ID 0 is reserved for fully-transparent pixels.
export function buildProvinceIndex(buf: PixelBuffer): ProvinceIndex {
  const { data, width, height } = buf
  const total = width * height
  const idData: Uint16Array = new Uint16Array(total)
  const colorToId = new Map<number, number>()
  let nextId = 1

  for (let i = 0; i < total; i++) {
    const base  = i * 4
    if (data[base + 3] === 0) { idData[i] = 0; continue }
    const packed = (data[base] << 16) | (data[base + 1] << 8) | data[base + 2]
    let id = colorToId.get(packed)
    if (id === undefined) {
      id = nextId++
      colorToId.set(packed, id)
    }
    idData[i] = id
  }

  return { idData, colorToId, provinceCount: nextId - 1 }
}

// Computes the per-pixel outer boundary ring of a province (the ring of
// non-province pixels adjacent to at least one province pixel).
// Also returns province pixel count and centroid for viewport centering.
export function computeEdgeMask(buf: PixelBuffer, packedColor: number): EdgeMaskResult {
  const { data, width, height } = buf
  const tr = (packedColor >> 16) & 0xff
  const tg = (packedColor >>  8) & 0xff
  const tb =  packedColor        & 0xff

  const canvas  = new OffscreenCanvas(width, height)
  const ctx     = canvas.getContext('2d')!
  const imgData = ctx.createImageData(width, height)
  const out     = imgData.data

  let provincePixels = 0
  const centroidAcc = vec2.create()

  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      const i = (row + x) * 4
      const isProvince = data[i] === tr && data[i + 1] === tg && data[i + 2] === tb
      if (isProvince) {
        provincePixels++
        centroidAcc[0] += x
        centroidAcc[1] += y
        continue
      }
      const isEdge =
        (y > 0      && data[((row - width + x)) * 4] === tr && data[((row - width + x)) * 4 + 1] === tg && data[((row - width + x)) * 4 + 2] === tb) ||
        (y < height - 1 && data[((row + width + x)) * 4] === tr && data[((row + width + x)) * 4 + 1] === tg && data[((row + width + x)) * 4 + 2] === tb) ||
        (x > 0      && data[(row + x - 1)  * 4] === tr && data[(row + x - 1)  * 4 + 1] === tg && data[(row + x - 1)  * 4 + 2] === tb) ||
        (x < width - 1  && data[(row + x + 1)  * 4] === tr && data[(row + x + 1)  * 4 + 1] === tg && data[(row + x + 1)  * 4 + 2] === tb)
      if (isEdge) {
        out[i] = out[i + 1] = out[i + 2] = 255
        out[i + 3] = 255
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)

  const centroid = provincePixels > 0
    ? { x: centroidAcc[0] / provincePixels, y: centroidAcc[1] / provincePixels }
    : null

  return { canvas, provincePixels, centroid }
}
