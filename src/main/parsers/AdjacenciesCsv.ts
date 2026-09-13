import type { MapAdjacency } from '../../shared/mapDataTypes'

function parseCoord(value: string | undefined): number | null {
  const n = Number.parseInt(value ?? '', 10)
  return Number.isInteger(n) && n >= 0 ? n : null
}

// map/adjacencies.csv: `From;To;Type;Through;start_x;start_y;stop_x;stop_y;adjacency_rule_name;Comment`.
// Manually-declared adjacencies (sea crossings, canals, explicit removals)
// that aren't implied by the provinces simply touching on the map.
export class AdjacenciesCsv {
  static parse(content: string): MapAdjacency[] {
    const result: MapAdjacency[] = []
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line) continue
      const cols = line.split(';')
      const from = Number.parseInt(cols[0], 10)
      const to = Number.parseInt(cols[1], 10)
      // Skips the header row and any malformed line — neither has a numeric From/To.
      if (!Number.isInteger(from) || !Number.isInteger(to)) continue

      result.push({
        from,
        to,
        type: (cols[2] ?? '').trim(),
        through: parseCoord(cols[3]),
        startX: parseCoord(cols[4]),
        startY: parseCoord(cols[5]),
        stopX: parseCoord(cols[6]),
        stopY: parseCoord(cols[7]),
        adjacencyRuleName: (cols[8] ?? '').trim() || undefined,
        comment: (cols[9] ?? '').trim() || undefined
      })
    }
    return result
  }
}
