export type PathKey =
  | 'descriptor'
  | 'defaultMap'
  | 'definitions'
  | 'provinces'
  | 'continent'
  | 'provinceTerrain'
  | 'states'
  | 'strategicRegions'
  | 'rivers'

// File paths resolve to a single absolute path (mod wins if present, else game).
// Folder paths resolve to a merged file list — mod files overwrite same-named game
// files, but unique files from both directories are included.
export interface ResolvedPaths {
  descriptor: string
  defaultMap: string
  definitions: string
  provinces: string
  continent: string
  provinceTerrain: string[]
  states: string[]
  strategicRegions: string[]
  rivers: string
}

export interface GameVerificationResult {
  valid: boolean
  missingPaths: PathKey[]
}

export interface ModVerificationResult {
  hasAny: boolean
  foundPaths: PathKey[]
  missingPaths: PathKey[]
}
