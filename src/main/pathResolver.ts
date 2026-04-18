import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { getConfig } from './config'
import type { ResolvedPaths } from '../shared/pathTypes'

// Returns the mod path if it exists, otherwise the game path.
function resolveFile(gamePath: string, modPath: string, rel: string): string {
  const modAbs = join(modPath, rel)
  return existsSync(modAbs) ? modAbs : join(gamePath, rel)
}

// Merges a game folder and a mod folder into a flat file list.
// Same filename → mod wins. Unique files from either directory are included.
function resolveFolder(gamePath: string, modPath: string, rel: string): string[] {
  const gameDir = join(gamePath, rel)
  const modDir = join(modPath, rel)
  const files = new Map<string, string>() // filename → absolute path

  if (existsSync(gameDir)) {
    for (const f of readdirSync(gameDir).sort((a, b) => a.localeCompare(b))) {
      files.set(f, join(gameDir, f))
    }
  }

  // Mod entries overwrite same-named game entries; new filenames are simply added.
  if (existsSync(modDir)) {
    for (const f of readdirSync(modDir).sort((a, b) => a.localeCompare(b))) {
      files.set(f, join(modDir, f))
    }
  }

  return Array.from(files.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, path]) => path)
}

export function resolvePaths(gamePath: string, modPath: string): ResolvedPaths {
  const p = getConfig().paths
  return {
    defaultMap:      resolveFile(gamePath, modPath, p.defaultMap),
    definitions:     resolveFile(gamePath, modPath, p.definitions),
    provinces:       resolveFile(gamePath, modPath, p.provinces),
    continent:       resolveFile(gamePath, modPath, p.continent),
    provinceTerrain: resolveFolder(gamePath, modPath, p.provinceTerrain)
  }
}
