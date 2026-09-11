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

// Recomputes tight bounding boxes for `affectedIds` after some of their
// pixels changed within `changedRegion` (a paint stroke or its revert) —
// without a full-image rescan. Before the edit, each id's existing bbox
// already bounded every pixel it had; the only pixels that could have
// changed are inside `changedRegion`. So scanning each id's old bbox
// unioned with `changedRegion` is guaranteed to cover every pixel that
// could now belong to it, however the edit moved that id's pixels around.
// An id with no remaining pixels in that scan has its bbox entry removed
// (it was fully painted over). Fixes the bboxes/adjacency staleness
// documented in provinceAnalysis.test.ts — bboxes only; adjacency isn't
// touched here (see that test for why).
export function updateProvinceBboxesForRegion(
  index: Pick<ProvinceIndex, 'idData' | 'bboxes'>,
  width: number,
  height: number,
  affectedIds: ReadonlySet<number>,
  changedRegion: { minX: number; minY: number; maxX: number; maxY: number }
): void {
  for (const id of affectedIds) {
    if (id === 0) continue
    const old = index.bboxes.get(id)
    const scanMinX = Math.max(0, Math.min(changedRegion.minX, old?.minX ?? changedRegion.minX))
    const scanMinY = Math.max(0, Math.min(changedRegion.minY, old?.minY ?? changedRegion.minY))
    const scanMaxX = Math.min(width - 1, Math.max(changedRegion.maxX, old?.maxX ?? changedRegion.maxX))
    const scanMaxY = Math.min(height - 1, Math.max(changedRegion.maxY, old?.maxY ?? changedRegion.maxY))

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (let y = scanMinY; y <= scanMaxY; y++) {
      const rowBase = y * width
      for (let x = scanMinX; x <= scanMaxX; x++) {
        if (index.idData[rowBase + x] !== id) continue
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }

    if (minX === Infinity) index.bboxes.delete(id)
    else index.bboxes.set(id, { minX, minY, maxX, maxY })
  }
}
