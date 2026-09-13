import { statSync } from 'fs'
import os from 'os'
import type { WorkerParsePool } from '../../workers/WorkerParsePool'
import { LocalisationCache } from './LocalisationCache'

const BATCH_SIZE = Math.max(1, os.cpus().length)

// Resolves `keys` against the mod's merged localisation/english files
// without ever fully parsing them.
//
// 1. Cached hits are returned via a stat() check only — no file content is
//    read at all for a key resolved in a previous pass (this session or an
//    earlier one).
// 2. Remaining keys trigger a streaming, key-filtered scan (LocalisationYml)
//    of candidate files, tried in small concurrent batches. Files that
//    previously yielded a hit are tried first, since state/strategic-region
//    names are very likely to cluster in the same file(s).
// 3. Scanning stops the moment every requested key has been found — a file
//    (or the whole remaining file list) is never touched once nothing is
//    left to look for.
export async function resolveLocalisationKeys(
  gamePath: string,
  modPath: string,
  localisationFiles: readonly string[],
  keys: ReadonlySet<string>,
  pool: WorkerParsePool
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>()
  if (keys.size === 0) return resolved

  const cache = LocalisationCache.load(gamePath, modPath)
  const missing = new Set<string>()
  for (const key of keys) {
    const cached = cache.get(key)
    if (cached !== undefined) resolved.set(key, cached)
    else missing.add(key)
  }

  if (missing.size > 0) {
    const known = cache.knownGoodFiles().filter((f) => localisationFiles.includes(f))
    const knownSet = new Set(known)
    const rest = localisationFiles.filter((f) => !knownSet.has(f))
    const ordered = [...known, ...rest]

    for (let i = 0; i < ordered.length && missing.size > 0; i += BATCH_SIZE) {
      const batch = ordered.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(batch.map(async (filePath) => {
        try {
          const entries = await pool.dispatch(filePath, 'localisation', { neededKeys: [...missing] })
          return { filePath, entries }
        } catch {
          // Unreadable/removed file — skip it, don't fail the whole pass.
          return { filePath, entries: [] }
        }
      }))

      for (const { filePath, entries } of results) {
        if (entries.length === 0) continue
        let stat
        try {
          stat = statSync(filePath)
        } catch {
          continue
        }
        for (const { key, value } of entries) {
          resolved.set(key, value)
          missing.delete(key)
          cache.set(key, value, filePath, stat.mtimeMs, stat.size)
        }
      }
    }
  }

  cache.save()
  return resolved
}
