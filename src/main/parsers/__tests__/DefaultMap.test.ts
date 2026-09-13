import { describe, expect, it } from 'vitest'
import { DefaultMap } from '../DefaultMap'

// Trimmed down from the vanilla file (comment lines, and unrelated fields, kept).
const VANILLA_DEFAULT_MAP = `
definitions = "definition.csv"
provinces = "provinces.bmp"
positions = "positions.txt"
terrain = "terrain.bmp"
rivers = "rivers.bmp"
heightmap = "heightmap.bmp"
tree_definition = "trees.bmp"
continent = "continent.txt"
adjacency_rules = "adjacency_rules.txt"
adjacencies = "adjacencies.csv"
#climate = "climate.txt"
ambient_object = "ambient_object.txt"
seasons = "seasons.txt"

# Define which indices in trees.bmp palette which should count as trees for automatic terrain assignment
tree = { 3 4 7 10 }
`

describe('DefaultMap.parse', () => {
  it('reads every declared file role', () => {
    const result = DefaultMap.parse(VANILLA_DEFAULT_MAP)

    expect(result.filePaths).toEqual({
      definitions: 'definition.csv',
      provinces: 'provinces.bmp',
      positions: 'positions.txt',
      terrain: 'terrain.bmp',
      rivers: 'rivers.bmp',
      heightmap: 'heightmap.bmp',
      treeDefinition: 'trees.bmp',
      continent: 'continent.txt',
      adjacencyRules: 'adjacency_rules.txt',
      adjacencies: 'adjacencies.csv',
      ambientObject: 'ambient_object.txt',
      seasons: 'seasons.txt'
      // climate is commented out and must not appear
    })
  })

  it('skips a commented-out assignment', () => {
    const result = DefaultMap.parse(VANILLA_DEFAULT_MAP)
    expect(result.filePaths.climate).toBeUndefined()
  })

  it('reads the tree palette index list', () => {
    const result = DefaultMap.parse(VANILLA_DEFAULT_MAP)
    expect(result.treeIndices).toEqual([3, 4, 7, 10])
  })

  it('a mod overriding one filename leaves the rest untouched', () => {
    const modded = VANILLA_DEFAULT_MAP.replace('definitions = "definition.csv"', 'definitions = "my_definitions.csv"')
    const result = DefaultMap.parse(modded)
    expect(result.filePaths.definitions).toBe('my_definitions.csv')
    expect(result.filePaths.provinces).toBe('provinces.bmp')
  })

  it('returns empty results for an empty file', () => {
    const result = DefaultMap.parse('')
    expect(result.filePaths).toEqual({})
    expect(result.treeIndices).toEqual([])
  })
})
