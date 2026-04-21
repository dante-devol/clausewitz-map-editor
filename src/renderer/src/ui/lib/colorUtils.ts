export type HsvColor = { h: number; s: number; v: number; a?: number }

export function normalizeHexCandidate(value: string): string | null {
  const normalized = value.trim().replace(/^#/, '').toLowerCase()
  if (!/^[0-9a-f]{6}$/.test(normalized)) return null
  return `#${normalized}`
}

export function hexToHsv(hex: string): HsvColor {
  const normalized = normalizeHexCandidate(hex) ?? '#ffffff'
  const r = parseInt(normalized.slice(1, 3), 16) / 255
  const g = parseInt(normalized.slice(3, 5), 16) / 255
  const b = parseInt(normalized.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6)
    else if (max === g) h = 60 * (((b - r) / delta) + 2)
    else h = 60 * (((r - g) / delta) + 4)
  }
  return { h: (h + 360) % 360, s: max === 0 ? 0 : delta / max, v: max, a: 1 }
}

export function hsvToHex(color: HsvColor): string {
  const h = ((color.h % 360) + 360) % 360
  const s = clamp01(color.s)
  const v = clamp01(color.v)
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0; let g = 0; let b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return `#${toHexChannel((r + m) * 255)}${toHexChannel((g + m) * 255)}${toHexChannel((b + m) * 255)}`
}

export function hsvToRgb(color: HsvColor): { r: number; g: number; b: number } {
  const hex = hsvToHex(color)
  return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) }
}

export function colorDistance(a: HsvColor, b: HsvColor): number {
  const rgbA = hsvToRgb(a)
  const rgbB = hsvToRgb(b)
  const dr = (rgbA.r - rgbB.r) / 255
  const dg = (rgbA.g - rgbB.g) / 255
  const db = (rgbA.b - rgbB.b) / 255
  const hueDelta = circularHueDistance(a.h, b.h) / 180
  const satDelta = a.s - b.s
  const valDelta = a.v - b.v
  return Math.sqrt(
    dr * dr * 0.45 + dg * dg * 0.8 + db * db * 0.35 +
    hueDelta * hueDelta * 0.9 + satDelta * satDelta * 0.35 + valDelta * valDelta * 0.2
  )
}

export function vividnessScore(color: HsvColor): number {
  return color.s * 0.7 + color.v * 0.3
}

function circularHueDistance(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360
  return Math.min(delta, 360 - delta)
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function toHexChannel(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0')
}
