import { StatesTxt } from '../parsers/StatesTxt'
import { StrategicRegionsTxt } from '../parsers/StrategicRegionsTxt'
import { TerrainTxt } from '../parsers/TerrainTxt'
import { StateCategoryTxt } from '../parsers/StateCategoryTxt'
import { ResourcesTxt } from '../parsers/ResourcesTxt'
import { BuildingsTxt } from '../parsers/BuildingsTxt'
import { DefinitionsCsv } from '../parsers/DefinitionsCsv'
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
}

export interface ParserOutputMap {
  states:           StateDefinition
  strategicRegions: StrategicRegionDefinition
  terrain:          TerrainCategory
  stateCategory:    StateCategory
  resources:        Resource
  buildings:        Building
  definitions:      Province
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
}
