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
  // Sequential ID → tight bounding box in image-space pixel coords.
  readonly bboxes: Map<number, { minX: number; minY: number; maxX: number; maxY: number }>
  // Sequential ID → set of adjacent sequential IDs (share ≥1 border pixel).
  readonly adjacency: Map<number, Set<number>>
}

// Two-pass scan:
//   Pass 1 – assign sequential uint16 IDs, build idData + colorToId.
//   Pass 2 – compute per-province bounding boxes and province adjacency.
// ID 0 is reserved for fully-transparent pixels.
export function buildProvinceIndex(buf: PixelBuffer): ProvinceIndex {
  const { data, width, height } = buf
  const total = width * height
  const idData = new Uint16Array(total)
  const colorToId = new Map<number, number>()
  let nextId = 1

  // Pass 1: assign IDs.
  for (let i = 0; i < total; i++) {
    const base = i * 4
    if (data[base + 3] === 0) { idData[i] = 0; continue }
    const packed = (data[base] << 16) | (data[base + 1] << 8) | data[base + 2]
    let id = colorToId.get(packed)
    if (id === undefined) { id = nextId++; colorToId.set(packed, id) }
    idData[i] = id
  }

  const provinceCount = nextId - 1

  // Pass 2: bounding boxes + adjacency.
  const bboxes = new Map<number, { minX: number; minY: number; maxX: number; maxY: number }>()
  const adjacency = new Map<number, Set<number>>()

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const id = idData[i]
      if (id === 0) continue

      // Bbox update.
      const bb = bboxes.get(id)
      if (!bb) {
        bboxes.set(id, { minX: x, minY: y, maxX: x, maxY: y })
      } else {
        if (x < bb.minX) bb.minX = x
        if (x > bb.maxX) bb.maxX = x
        if (y < bb.minY) bb.minY = y
        if (y > bb.maxY) bb.maxY = y
      }

      // Adjacency: check right and down neighbours only (symmetric, so each pair found once).
      if (x < width - 1) {
        const rid = idData[i + 1]
        if (rid !== 0 && rid !== id) {
          addAdj(adjacency, id, rid)
        }
      }
      if (y < height - 1) {
        const did = idData[i + width]
        if (did !== 0 && did !== id) {
          addAdj(adjacency, id, did)
        }
      }
    }
  }

  return { idData, colorToId, provinceCount, bboxes, adjacency }
}

function addAdj(map: Map<number, Set<number>>, a: number, b: number): void {
  let sa = map.get(a)
  if (!sa) { sa = new Set(); map.set(a, sa) }
  sa.add(b)
  let sb = map.get(b)
  if (!sb) { sb = new Set(); map.set(b, sb) }
  sb.add(a)
}
