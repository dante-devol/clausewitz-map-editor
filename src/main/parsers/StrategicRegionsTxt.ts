import { readFileSync } from 'fs'
import type { StrategicRegionDefinition, WeatherPeriod } from '../../shared/mapDataTypes'

export class StrategicRegionsTxt {
  private readonly filePaths: string[]

  constructor(filePaths: string[]) {
    this.filePaths = filePaths
  }

  load(): StrategicRegionDefinition[] {
    const regions = new Map<number, StrategicRegionDefinition>()
    for (const filePath of this.filePaths) {
      const content = readFileSync(filePath, 'utf-8')
      const parsed = StrategicRegionsTxt.parse(content).map((r) => ({ ...r, sourcePath: filePath }))
      for (const region of parsed) regions.set(region.id, region)
    }
    return [...regions.values()].sort((a, b) => a.id - b.id)
  }

  static parse(content: string): StrategicRegionDefinition[] {
    const regions: StrategicRegionDefinition[] = []

    const blockRegex = /\bstrategic_region\s*=\s*\{/g
    let match: RegExpExecArray | null
    while ((match = blockRegex.exec(content)) !== null) {
      const openIdx = match.index + match[0].length - 1
      const block = extractBlock(content, openIdx)
      if (!block) break

      const regionId = parseScalarInt(block.content, 'id')
      const name = parseScalarString(block.content, 'name') ?? ''
      const provinceIds = parseNumberListBlock(block.content, 'provinces')
      const weatherPeriods = parseWeatherBlock(block.content)

      if (regionId !== null) {
        regions.push({ id: regionId, name, provinceIds, weatherPeriods })
      }

      blockRegex.lastIndex = block.end
    }

    return regions
  }
}

function parseWeatherBlock(content: string): WeatherPeriod[] {
  const weatherMatch = /\bweather\s*=\s*\{/.exec(content)
  if (!weatherMatch) return []

  const openIdx = weatherMatch.index + weatherMatch[0].length - 1
  const weatherBlock = extractBlock(content, openIdx)
  if (!weatherBlock) return []

  const periods: WeatherPeriod[] = []
  const periodRegex = /\bperiod\s*=\s*\{/g
  let periodMatch: RegExpExecArray | null
  while ((periodMatch = periodRegex.exec(weatherBlock.content)) !== null) {
    const pOpenIdx = periodMatch.index + periodMatch[0].length - 1
    const pBlock = extractBlock(weatherBlock.content, pOpenIdx)
    if (!pBlock) break

    const between = parseTwoFloatBlock(pBlock.content, 'between') ?? [0, 30]
    const temperature = parseTwoFloatBlock(pBlock.content, 'temperature') ?? [0, 0]
    const minSnowLevel = parseScalarFloat(pBlock.content, 'min_snow_level')
    const weatherWeights = parseWeatherWeights(pBlock.content)

    periods.push({
      between: between as [number, number],
      temperature: temperature as [number, number],
      ...(minSnowLevel !== null ? { minSnowLevel } : {}),
      weatherWeights
    })

    periodRegex.lastIndex = pBlock.end
  }

  return periods
}

const PERIOD_STRUCTURAL_KEYS = new Set(['between', 'temperature', 'min_snow_level', 'temperature_day_night'])

function parseWeatherWeights(content: string): Record<string, number> {
  const weights: Record<string, number> = {}
  // Match key = float pairs, skipping block values (between/temperature use { })
  const kvRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([\d.]+(?:\.\d+)?)\b/g
  let m: RegExpExecArray | null
  while ((m = kvRegex.exec(content)) !== null) {
    const key = m[1]
    if (PERIOD_STRUCTURAL_KEYS.has(key)) continue
    const val = parseFloat(m[2])
    if (!Number.isNaN(val)) weights[key] = val
  }
  return weights
}

interface Block {
  content: string
  end: number
}

function extractBlock(str: string, openIdx: number): Block | null {
  let depth = 0
  for (let i = openIdx; i < str.length; i++) {
    if (str[i] === '{') depth++
    else if (str[i] === '}') {
      depth--
      if (depth === 0) return { content: str.slice(openIdx + 1, i), end: i + 1 }
    } else if (str[i] === '#') {
      while (i < str.length && str[i] !== '\n') i++
    }
  }
  return null
}

function parseScalarInt(content: string, key: string): number | null {
  const match = content.match(new RegExp(`\\b${escapeRegExp(key)}\\s*=\\s*(\\d+)\\b`))
  if (!match) return null
  const value = parseInt(match[1], 10)
  return Number.isNaN(value) ? null : value
}

function parseScalarFloat(content: string, key: string): number | null {
  const match = content.match(new RegExp(`\\b${escapeRegExp(key)}\\s*=\\s*([\\d.]+(?:\\.\\d+)?)\\b`))
  if (!match) return null
  const value = parseFloat(match[1])
  return Number.isNaN(value) ? null : value
}

function parseScalarString(content: string, key: string): string | null {
  const match = content.match(new RegExp(`\\b${escapeRegExp(key)}\\s*=\\s*"([^"]*)"(?:\\s|$)`))
  if (match) return match[1]
  const bareMatch = content.match(new RegExp(`\\b${escapeRegExp(key)}\\s*=\\s*([^\\s{}"#]+)`))
  return bareMatch ? bareMatch[1] : null
}

function parseTwoFloatBlock(content: string, key: string): [number, number] | null {
  const match = new RegExp(`\\b${escapeRegExp(key)}\\s*=\\s*\\{`).exec(content)
  if (!match) return null
  const openIdx = match.index + match[0].length - 1
  const block = extractBlock(content, openIdx)
  if (!block) return null
  const nums = [...block.content.matchAll(/[\d.]+(?:\.\d+)?/g)].map((m) => parseFloat(m[0]))
  if (nums.length < 2) return null
  return [nums[0], nums[1]]
}

function parseNumberListBlock(content: string, key: string): number[] {
  const match = new RegExp(`\\b${escapeRegExp(key)}\\s*=\\s*\\{`).exec(content)
  if (!match) return []

  const openIdx = match.index + match[0].length - 1
  const block = extractBlock(content, openIdx)
  if (!block) return []

  return [...block.content.matchAll(/\b\d+\b/g)].map((entry) => parseInt(entry[0], 10))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
