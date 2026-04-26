import { StatesTxt } from '../parsers/StatesTxt'
import { StrategicRegionsTxt } from '../parsers/StrategicRegionsTxt'
import { TerrainTxt } from '../parsers/TerrainTxt'
import { DefinitionsCsv } from '../parsers/DefinitionsCsv'
import type { StateDefinition, StrategicRegionDefinition, TerrainCategory, Province, Continent } from '../../shared/mapDataTypes'

export interface ParserInputMap {
  states:           { content: string }
  strategicRegions: { content: string }
  terrain:          { content: string }
  definitions:      { content: string; continents: Continent[] }
}

export interface ParserOutputMap {
  states:           StateDefinition
  strategicRegions: StrategicRegionDefinition
  terrain:          TerrainCategory
  definitions:      Province
}

export type ParserKey = keyof ParserInputMap

export const parserRegistry: { [K in ParserKey]: (input: ParserInputMap[K]) => ParserOutputMap[K][] } = {
  states:           ({ content }) => StatesTxt.parse(content),
  strategicRegions: ({ content }) => StrategicRegionsTxt.parse(content),
  terrain:          ({ content }) => TerrainTxt.parse(content),
  definitions:      ({ content, continents }) => DefinitionsCsv.parse(content, continents),
}
