import { isAbsolute, join, relative, resolve, sep } from 'path'

export interface ProjectRoots {
  gamePath: string
  modPath: string
}

// Maps a file the project reads to the file a save must write.
//
// Files already in the mod folder are written in place. Files that come from
// the base game are redirected to the same relative path inside the mod
// (copy-on-write), so the game install is never modified. Anything outside
// both roots is refused.
export function resolveWriteTarget(roots: ProjectRoots, readPath: string): string {
  const absolute = resolve(readPath)
  if (relativeInside(roots.modPath, absolute) !== null) return absolute
  const fromGame = relativeInside(roots.gamePath, absolute)
  if (fromGame !== null) return join(resolve(roots.modPath), fromGame)
  throw new Error(`Refusing to write outside the mod folder: ${readPath}`)
}

// True when `candidate` is `root` itself or somewhere beneath it.
export function isSameOrInside(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate))
  return rel === '' || relativeInside(root, candidate) !== null
}

function relativeInside(root: string, absolute: string): string | null {
  const rel = relative(resolve(root), absolute)
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return null
  return rel
}
