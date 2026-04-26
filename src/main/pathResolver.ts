import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { getConfig } from './config'
import type { ResolvedPaths } from '../shared/pathTypes'
import { normalizeRelativePath } from './parsers/DescriptorMod'

// Returns the mod path if it exists, otherwise the game path.
function resolveFile(gamePath: string, modPath: string, rel: string, replacePaths: readonly string[]): string {
  const modAbs = join(modPath, rel)
  if (isPathReplaced(rel, replacePaths)) return modAbs
  return existsSync(modAbs) ? modAbs : join(gamePath, rel)
}

// Merges a game folder and a mod folder into a flat file list.
// Same filename → mod wins. Unique files from either directory are included.
function resolveFolder(gamePath: string, modPath: string, rel: string, replacePaths: readonly string[]): string[] {
  const gameDir = join(gamePath, rel)
  const modDir = join(modPath, rel)
  const files = new Map<string, string>() // filename → absolute path

  if (!isPathReplaced(rel, replacePaths) && existsSync(gameDir)) {
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

function isPathReplaced(rel: string, replacePaths: readonly string[]): boolean {
  const normalized = normalizeRelativePath(rel)
  return replacePaths.some((entry) => normalized === entry || normalized.startsWith(`${entry}/`))
}

export function resolvePaths(gamePath: string, modPath: string, replacePaths: readonly string[] = []): ResolvedPaths {
  const p = getConfig().paths
  return {
    descriptor:      join(modPath, p.descriptor),
    defaultMap:      resolveFile(gamePath, modPath, p.defaultMap, replacePaths),
    definitions:     resolveFile(gamePath, modPath, p.definitions, replacePaths),
    provinces:       resolveFile(gamePath, modPath, p.provinces, replacePaths),
    continent:       resolveFile(gamePath, modPath, p.continent, replacePaths),
    provinceTerrain: resolveFolder(gamePath, modPath, p.provinceTerrain, replacePaths),
    states:          resolveFolder(gamePath, modPath, p.states, replacePaths),
    strategicRegions: resolveFolder(gamePath, modPath, p.strategicRegions, replacePaths),
    rivers:          resolveFile(gamePath, modPath, p.rivers, replacePaths),
    stateCategories: resolveFolder(gamePath, modPath, p.stateCategories, replacePaths),
    resources:       resolveFolder(gamePath, modPath, p.resources, replacePaths),
    buildings:       resolveFolder(gamePath, modPath, p.buildings, replacePaths)
  }
}
