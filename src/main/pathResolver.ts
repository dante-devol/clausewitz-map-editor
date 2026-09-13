import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { getConfig } from './config'
import type { ResolvedPaths } from '../shared/pathTypes'
import { normalizeRelativePath } from './parsers/DescriptorMod'
import { DefaultMap, type DefaultMapFilePaths } from './parsers/DefaultMap'
import { timeSync } from './perf'

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

// default.map can rename any of a handful of files it declares (e.g.
// `definitions = "my_definitions.csv"`) without moving them out of the /map
// folder — so an override only ever replaces the filename, not the folder,
// of the corresponding config path.
function withDefaultMapOverride(configRel: string, override: string | undefined): string {
  if (!override) return configRel
  const folder = configRel.slice(0, configRel.lastIndexOf('/') + 1)
  return `${folder}${normalizeRelativePath(override)}`
}

function readDefaultMap(defaultMapPath: string): DefaultMapFilePaths {
  try {
    if (!existsSync(defaultMapPath)) return {}
    return DefaultMap.parse(readFileSync(defaultMapPath, 'utf-8')).filePaths
  } catch {
    return {}
  }
}

export function resolvePaths(gamePath: string, modPath: string, replacePaths: readonly string[] = []): ResolvedPaths {
  return timeSync('resolvePaths', () => resolvePathsInner(gamePath, modPath, replacePaths))
}

function resolvePathsInner(gamePath: string, modPath: string, replacePaths: readonly string[]): ResolvedPaths {
  const p = getConfig().paths
  const defaultMapPath = resolveFile(gamePath, modPath, p.defaultMap, replacePaths)
  const overrides = readDefaultMap(defaultMapPath)

  return {
    descriptor:      join(modPath, p.descriptor),
    defaultMap:      defaultMapPath,
    definitions:     resolveFile(gamePath, modPath, withDefaultMapOverride(p.definitions, overrides.definitions), replacePaths),
    provinces:       resolveFile(gamePath, modPath, withDefaultMapOverride(p.provinces, overrides.provinces), replacePaths),
    continent:       resolveFile(gamePath, modPath, withDefaultMapOverride(p.continent, overrides.continent), replacePaths),
    provinceTerrain: resolveFolder(gamePath, modPath, p.provinceTerrain, replacePaths),
    states:          resolveFolder(gamePath, modPath, p.states, replacePaths),
    strategicRegions: resolveFolder(gamePath, modPath, p.strategicRegions, replacePaths),
    rivers:          resolveFile(gamePath, modPath, withDefaultMapOverride(p.rivers, overrides.rivers), replacePaths),
    stateCategories: resolveFolder(gamePath, modPath, p.stateCategories, replacePaths),
    resources:       resolveFolder(gamePath, modPath, p.resources, replacePaths),
    buildings:       resolveFolder(gamePath, modPath, p.buildings, replacePaths),
    weather:         resolveFile(gamePath, modPath, p.weather, replacePaths),
    // Filtered to .yml: mods sometimes drop stray non-loc files (README, .txt
    // notes) into their localisation folder.
    localisation:    resolveFolder(gamePath, modPath, p.localisation, replacePaths)
                       .filter((f) => f.toLowerCase().endsWith('.yml')),
    adjacencies:     resolveFile(gamePath, modPath, withDefaultMapOverride(p.adjacencies, overrides.adjacencies), replacePaths),
    // Not declared in default.map — always the fixed conventional filename.
    supplyNodes:     resolveFile(gamePath, modPath, p.supplyNodes, replacePaths),
    railways:        resolveFile(gamePath, modPath, p.railways, replacePaths)
  }
}
