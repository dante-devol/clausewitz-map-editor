// Greedy graph coloring, scoped to a small subset of provinces (e.g. the
// members of one selected state or strategic region) rather than the whole
// map — the induced subgraph is tiny regardless of total province count, so
// a simple greedy pass is cheap enough to run on every selection change.
//
// Welsh-Powell style: color the highest-degree (within the group) province
// first, each time picking the lowest class index not already used by an
// already-colored neighbor. Not guaranteed to stay within any particular
// class count, but province-adjacency subgraphs of this size are almost
// always 4-6 colorable in practice; callers should treat the class index as
// unbounded and wrap it onto a fixed-size display palette (class % N) so an
// occasional overflow degrades to a repeated color rather than breaking.
export function colorProvinceSubgraph(
  memberIds: readonly number[],
  adjacency: ReadonlyMap<number, ReadonlySet<number>>
): Map<number, number> {
  const members = new Set(memberIds)

  const degreeWithinGroup = new Map<number, number>()
  for (const id of memberIds) {
    const neighbors = adjacency.get(id)
    let degree = 0
    if (neighbors) for (const n of neighbors) if (members.has(n)) degree++
    degreeWithinGroup.set(id, degree)
  }

  const order = [...memberIds].sort((a, b) => degreeWithinGroup.get(b)! - degreeWithinGroup.get(a)!)

  const colorClassById = new Map<number, number>()
  for (const id of order) {
    const neighbors = adjacency.get(id)
    const usedByNeighbors = new Set<number>()
    if (neighbors) {
      for (const n of neighbors) {
        if (!members.has(n)) continue
        const cls = colorClassById.get(n)
        if (cls !== undefined) usedByNeighbors.add(cls)
      }
    }
    let cls = 0
    while (usedByNeighbors.has(cls)) cls++
    colorClassById.set(id, cls)
  }

  return colorClassById
}

// The reveal shader colorizes each pixel by taking hue+saturation from the
// fill color returned here but *lightness from whatever's already on
// screen* (see FRAG_REVEAL in MapRenderer.ts) — so a fill color's own
// lightness never survives to the display, only its hue and saturation do.
// Picking fill colors for maximum *RGB* distance (as an earlier version of
// this did) optimizes for a property that gets thrown away and ignores the
// one that doesn't: two candidates that are RGB-far-apart mostly because of
// differing lightness can end up looking identical once forced onto the
// same base lightness. So instead of ranking a fixed candidate list, this
// generates `count` hues evenly spaced around the color wheel at a fixed
// saturation — the thing that actually determines how distinct the result
// looks — which also scales to any count instead of running out and cycling
// once past a fixed candidate list's size.
const FILL_SATURATION = 0.70
const FILL_LIGHTNESS = 0.5 // arbitrary — the reveal shader discards this

export function pickDistinctPalette(count: number): number[] {
  const palette: number[] = []
  for (let i = 0; i < count; i++) {
    palette.push(hslToPackedColor(i / count, FILL_SATURATION, FILL_LIGHTNESS))
  }
  return palette
}

function hslToPackedColor(h: number, s: number, l: number): number {
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255)
  const g = Math.round(hue2rgb(p, q, h) * 255)
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  return (r << 16) | (g << 8) | b
}
