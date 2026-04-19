import type { ProvinceBitmapFact, ProvinceBitmapFacts } from '../../../../shared/provinceCatalog'

export function analyzeProvinceBitmapFacts(input: {
  data: Uint8ClampedArray
  width: number
  height: number
}): ProvinceBitmapFacts {
  const byColor = new Map<number, ProvinceBitmapFact>()
  const total = input.width * input.height

  for (let i = 0; i < total; i++) {
    const base = i * 4
    if (input.data[base + 3] === 0) continue

    const color = (input.data[base] << 16) | (input.data[base + 1] << 8) | input.data[base + 2]
    const x = i % input.width
    const y = Math.floor(i / input.width)
    const existing = byColor.get(color)

    if (!existing) {
      byColor.set(color, {
        color,
        pixelCount: 1,
        bounds: { minX: x, minY: y, maxX: x, maxY: y }
      })
      continue
    }

    existing.pixelCount += 1
    if (x < existing.bounds.minX) existing.bounds.minX = x
    if (x > existing.bounds.maxX) existing.bounds.maxX = x
    if (y < existing.bounds.minY) existing.bounds.minY = y
    if (y > existing.bounds.maxY) existing.bounds.maxY = y
  }

  const colors = [...byColor.keys()].sort((a, b) => a - b)
  return { colors, byColor }
}
