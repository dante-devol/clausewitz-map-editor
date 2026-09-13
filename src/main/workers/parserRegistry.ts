import { StatesTxt } from '../parsers/StatesTxt'
import { StrategicRegionsTxt } from '../parsers/StrategicRegionsTxt'
import { TerrainTxt } from '../parsers/TerrainTxt'
import { StateCategoryTxt } from '../parsers/StateCategoryTxt'
import { ResourcesTxt } from '../parsers/ResourcesTxt'
import { BuildingsTxt } from '../parsers/BuildingsTxt'
import { DefinitionsCsv } from '../parsers/DefinitionsCsv'
import { LocalisationYml, type LocalisationEntry } from '../parsers/LocalisationYml'
import type {
  Building,
  Continent,
  Province,
  Resource,
  StateCategory,
  StateDefinition,
  StrategicRegionDefinition,
  TerrainCategory
} from '../../shared/mapDataTypes'

export interface ParserInputMap {
  states:           { content: string }
  strategicRegions: { content: string }
  terrain:          { content: string }
  stateCategory:    { content: string }
  resources:        { content: string }
  buildings:        { content: string }
  definitions:      { content: string; continents: Continent[] }
  localisation:     { content: string; neededKeys: string[] }
}

export interface ParserOutputMap {
  states:           StateDefinition
  strategicRegions: StrategicRegionDefinition
  terrain:          TerrainCategory
  stateCategory:    StateCategory
  resources:        Resource
  buildings:        Building
  definitions:      Province
  localisation:     LocalisationEntry
}

export type ParserKey = keyof ParserInputMap

export const parserRegistry: { [K in ParserKey]: (input: ParserInputMap[K]) => ParserOutputMap[K][] } = {
  states:           ({ content }) => StatesTxt.parse(content),
  strategicRegions: ({ content }) => StrategicRegionsTxt.parse(content),
  terrain:          ({ content }) => TerrainTxt.parse(content),
  stateCategory:    ({ content }) => StateCategoryTxt.parse(content),
  resources:        ({ content }) => ResourcesTxt.parse(content),
  buildings:        ({ content }) => BuildingsTxt.parse(content),
  definitions:      ({ content, continents }) => DefinitionsCsv.parse(content, continents),
  localisation:     ({ content, neededKeys }) => LocalisationYml.parse(content, new Set(neededKeys)),
}

// A union-indexed lookup like `parserRegistry[task.key]` yields a union of
// function types, and TS can't safely call that with a union argument. Going
// through a generic type parameter keeps the key and input tied together so
// the call type-checks.
export function runParser<K extends ParserKey>(key: K, input: ParserInputMap[K]): ParserOutputMap[K][] {
  return parserRegistry[key](input)
}
