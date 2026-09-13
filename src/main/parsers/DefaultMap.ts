import { bareNumbers, blockOf, firstAssignment, parseScript, scalarOf } from './script/ScriptParser'

// Bare filenames as declared in default.map (e.g. `definitions = "definition.csv"`),
// relative to the /map folder — a mod overriding one of these is telling us to
// load a differently-named file for that role instead of the config default.
export interface DefaultMapFilePaths {
  definitions?: string
  provinces?: string
  positions?: string
  terrain?: string
  rivers?: string
  heightmap?: string
  treeDefinition?: string
  continent?: string
  adjacencyRules?: string
  adjacencies?: string
  ambientObject?: string
  seasons?: string
  climate?: string
}

export interface DefaultMapData {
  filePaths: DefaultMapFilePaths
  // Palette indices in trees.bmp that count as trees for automatic terrain assignment.
  treeIndices: number[]
}

const FILE_KEYS: Record<keyof DefaultMapFilePaths, string> = {
  definitions: 'definitions',
  provinces: 'provinces',
  positions: 'positions',
  terrain: 'terrain',
  rivers: 'rivers',
  heightmap: 'heightmap',
  treeDefinition: 'tree_definition',
  continent: 'continent',
  adjacencyRules: 'adjacency_rules',
  adjacencies: 'adjacencies',
  ambientObject: 'ambient_object',
  seasons: 'seasons',
  climate: 'climate'
}

export class DefaultMap {
  static parse(content: string): DefaultMapData {
    const root = parseScript(content).root

    const filePaths: DefaultMapFilePaths = {}
    for (const [key, scriptKey] of Object.entries(FILE_KEYS) as [keyof DefaultMapFilePaths, string][]) {
      const value = scalarOf(firstAssignment(root, scriptKey))
      if (value) filePaths[key] = value
    }

    const treeBlock = blockOf(firstAssignment(root, 'tree'))
    const treeIndices = treeBlock ? bareNumbers(treeBlock) : []

    return { filePaths, treeIndices }
  }
}
