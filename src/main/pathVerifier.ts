import { existsSync } from 'fs'
import { join } from 'path'
import { getConfig } from './config'
import type { GameVerificationResult, ModVerificationResult, PathKey } from '../shared/pathTypes'

function pathEntries(): [PathKey, string][] {
  return Object.entries(getConfig().paths) as [PathKey, string][]
}

// All configured paths must exist under the game directory.
export function verifyGamePaths(gamePath: string): GameVerificationResult {
  const missingPaths: PathKey[] = []
  for (const [key, rel] of pathEntries()) {
    if (!existsSync(join(gamePath, rel))) missingPaths.push(key)
  }
  return { valid: missingPaths.length === 0, missingPaths }
}

// Warn if the mod has none of the expected paths — it may still be valid (full overwrite mod, empty project, etc).
export function verifyModPaths(modPath: string): ModVerificationResult {
  const foundPaths: PathKey[] = []
  const missingPaths: PathKey[] = []
  for (const [key, rel] of pathEntries()) {
    if (existsSync(join(modPath, rel))) foundPaths.push(key)
    else missingPaths.push(key)
  }
  return { hasAny: foundPaths.length > 0, foundPaths, missingPaths }
}
