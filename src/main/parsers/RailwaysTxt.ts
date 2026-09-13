import type { Railway } from '../../shared/mapDataTypes'

// map/railways.txt: one `<level> <provinceCount> <province1> ... <provinceN>`
// chain per line.
export class RailwaysTxt {
  static parse(content: string): Railway[] {
    const result: Railway[] = []
    for (const rawLine of content.split(/\r?\n/)) {
      const trimmed = rawLine.trim()
      if (!trimmed) continue
      const numbers = trimmed.split(/\s+/).map((part) => Number.parseInt(part, 10))
      if (numbers.length < 3 || numbers.some((n) => !Number.isInteger(n))) continue

      const [level, count, ...provinceIds] = numbers
      result.push({ level, provinceIds: provinceIds.slice(0, count) })
    }
    return result
  }
}
