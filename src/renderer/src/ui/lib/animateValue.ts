import { vec2 } from 'gl-matrix'

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3

// Runs a timed RAF animation loop. Calls onTick with an eased t ∈ [0, 1]
// each frame. Returns a cancel function; safe to call after completion.
export function animateValue(
  duration: number,
  easing: (t: number) => number,
  onTick: (t: number) => void
): () => void {
  let handle = -1
  let startTime = -1
  let cancelled = false

  const loop = (now: number) => {
    if (cancelled) return
    if (startTime < 0) startTime = now
    const t = Math.min(1, (now - startTime) / duration)
    onTick(easing(t))
    if (t < 1) handle = requestAnimationFrame(loop)
  }
  handle = requestAnimationFrame(loop)

  return () => {
    cancelled = true
    if (handle >= 0) cancelAnimationFrame(handle)
  }
}

// Interpolates two 2D positions using gl-matrix vec2.lerp.
export function lerpVec2(
  out: vec2,
  a: vec2,
  b: vec2,
  t: number
): vec2 {
  return vec2.lerp(out, a, b, t) as vec2
}
