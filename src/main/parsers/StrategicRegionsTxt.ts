import type { StrategicRegionDefinition, WeatherPeriod } from '../../shared/mapDataTypes'
import {
  assignmentsOf,
  bareNumbers,
  blockOf,
  firstAssignment,
  numberOf,
  parseScript,
  scalarOf,
  type ScriptAssignment,
  type ScriptBlock
} from './script/ScriptParser'
import { numericAssignments } from './script/ScriptEditing'

export class StrategicRegionsTxt {
  static parse(content: string): StrategicRegionDefinition[] {
    const doc = parseScript(content)
    const regions: StrategicRegionDefinition[] = []
    for (const entry of regionAssignments(doc.root)) {
      const region = readRegion(entry.value as ScriptBlock)
      if (region) regions.push(region)
    }
    return regions
  }
}

// Top-level `strategic_region = { ... }` blocks.
export function regionAssignments(root: ScriptBlock): ScriptAssignment[] {
  return assignmentsOf(root, 'strategic_region').filter((entry) => entry.value.kind === 'block')
}

export function readRegionId(block: ScriptBlock): number | null {
  return numberOf(firstAssignment(block, 'id'))
}

export function readRegion(block: ScriptBlock): StrategicRegionDefinition | null {
  const id = readRegionId(block)
  if (id === null) return null
  const provincesBlock = blockOf(firstAssignment(block, 'provinces'))
  const name = scalarOf(firstAssignment(block, 'name')) ?? ''
  return {
    id,
    name,
    // No localisation is resolved at parse time — this is upgraded once
    // ProjectSession's background localisation pass resolves `name`.
    displayName: name,
    provinceIds: provincesBlock ? bareNumbers(provincesBlock) : [],
    weatherPeriods: periodAssignments(blockOf(firstAssignment(block, 'weather'))).map((entry) => readPeriod(entry.value as ScriptBlock))
  }
}

export function periodAssignments(weather: ScriptBlock | undefined): ScriptAssignment[] {
  if (!weather) return []
  return assignmentsOf(weather, 'period').filter((entry) => entry.value.kind === 'block')
}

export const PERIOD_STRUCTURAL_KEYS = new Set(['between', 'temperature', 'min_snow_level', 'temperature_day_night'])

export function isWeatherWeightKey(key: string): boolean {
  return !PERIOD_STRUCTURAL_KEYS.has(key.toLowerCase())
}

export function readPeriod(block: ScriptBlock): WeatherPeriod {
  const minSnowLevel = numberOf(firstAssignment(block, 'min_snow_level'))
  const weatherWeights: Record<string, number> = {}
  for (const { key, value } of numericAssignments(block, isWeatherWeightKey)) weatherWeights[key] = value
  return {
    between: readPair(block, 'between') ?? [0, 30],
    temperature: readPair(block, 'temperature') ?? [0, 0],
    ...(minSnowLevel !== null ? { minSnowLevel } : {}),
    weatherWeights
  }
}

function readPair(block: ScriptBlock, key: string): [number, number] | null {
  const pairBlock = blockOf(firstAssignment(block, key))
  if (!pairBlock) return null
  const numbers = bareNumbers(pairBlock)
  return numbers.length >= 2 ? [numbers[0], numbers[1]] : null
}
