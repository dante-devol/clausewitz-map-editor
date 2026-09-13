import type { SupplyNode } from '../../shared/mapDataTypes'

// map/supply_nodes.txt: one `<level> <provinceId>` pair per line.
export class SupplyNodesTxt {
  static parse(content: string): SupplyNode[] {
    const result: SupplyNode[] = []
    for (const rawLine of content.split(/\r?\n/)) {
      const parts = rawLine.trim().split(/\s+/).filter(Boolean)
      if (parts.length < 2) continue
      const level = Number.parseInt(parts[0], 10)
      const provinceId = Number.parseInt(parts[1], 10)
      if (!Number.isInteger(level) || !Number.isInteger(provinceId)) continue
      result.push({ level, provinceId })
    }
    return result
  }
}
