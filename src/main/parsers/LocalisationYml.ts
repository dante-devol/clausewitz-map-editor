export interface LocalisationEntry {
  key: string
  value: string
}

// Paradox localisation files are line-oriented (`KEY:0 "value"`), not
// Clausewitz script, and can be very large (tens of MB) while containing
// mostly-irrelevant entries for any one lookup. Rather than fully parsing
// every line into a Map, this scans for a specific set of keys: a cheap
// substring-and-Set check on every line, with the expensive quoted-value
// extraction only run on an actual match. Scanning stops the moment every
// key in `neededKeys` has been found, so a huge file that happens to hold
// its matches early costs almost nothing.
export class LocalisationYml {
  static parse(content: string, neededKeys: ReadonlySet<string>): LocalisationEntry[] {
    const found: LocalisationEntry[] = []
    let remaining = neededKeys.size
    if (remaining === 0) return found

    const seen = new Set<string>()
    const len = content.length
    let start = 0

    while (start < len && remaining > 0) {
      let end = content.indexOf('\n', start)
      if (end === -1) end = len
      const line = content.slice(start, end)
      start = end + 1

      const colon = line.indexOf(':')
      if (colon <= 0) continue

      const key = line.slice(0, colon).trim()
      if (seen.has(key) || !neededKeys.has(key)) continue

      const value = extractQuotedValue(line, colon)
      if (value === null) continue

      found.push({ key, value })
      seen.add(key)
      remaining--
    }

    return found
  }
}

// Extracts the first quoted, backslash-escaped string starting at or after
// `fromIndex`. Returns null if the line has no (properly closed) quoted value.
function extractQuotedValue(line: string, fromIndex: number): string | null {
  const firstQuote = line.indexOf('"', fromIndex)
  if (firstQuote === -1) return null

  let out = ''
  for (let i = firstQuote + 1; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\' && i + 1 < line.length) {
      out += line[i + 1]
      i++
      continue
    }
    if (ch === '"') return out
    out += ch
  }
  return null
}
