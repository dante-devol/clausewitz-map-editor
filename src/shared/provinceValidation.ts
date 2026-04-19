import type { Continent, Province, TerrainCategory } from './mapDataTypes'

export type ProvinceValidationSeverity = 'info' | 'warning' | 'error'
export type ProvinceValidationDisposition = 'ignore' | 'annotate' | 'focus' | 'block'
export type ProvinceValidationDomain = 'metadata' | 'geometry' | 'topology' | 'cross-file'

export interface ProvinceGeometryMetrics {
  pixelCount: number
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  adjacentProvinceIds: number[]
}

export interface ProvinceValidationSnapshot {
  provinces: ReadonlyMap<number, Province>
  provincesByColor: ReadonlyMap<number, number>
  terrains: ReadonlyMap<string, TerrainCategory>
  continents: ReadonlyMap<string, Continent>
  geometryByProvinceId?: ReadonlyMap<number, ProvinceGeometryMetrics>
  colorToProvinceIdFromImage?: ReadonlyMap<number, number>
}

export interface ProvinceValidationContext {
  snapshot: ProvinceValidationSnapshot
}

export interface ProvinceValidationFinding {
  ruleId: string
  code: string
  severity: ProvinceValidationSeverity
  domain: ProvinceValidationDomain
  provinceIds: number[]
  message: string
  suggestedDisposition?: ProvinceValidationDisposition
  data?: Record<string, string | number | boolean | null>
}

export interface ProvinceValidationRule {
  id: string
  name: string
  domain: ProvinceValidationDomain
  description?: string
  applies(context: ProvinceValidationContext): boolean
  evaluate(context: ProvinceValidationContext): ProvinceValidationFinding[]
}

export interface ProvinceValidationPolicy {
  severityDisposition: Record<ProvinceValidationSeverity, ProvinceValidationDisposition>
}

export interface ProvinceValidationResult {
  findings: ProvinceValidationFinding[]
  blockingFindings: ProvinceValidationFinding[]
  summary: {
    infoCount: number
    warningCount: number
    errorCount: number
  }
}

export const DEFAULT_PROVINCE_VALIDATION_POLICY: ProvinceValidationPolicy = {
  severityDisposition: {
    info: 'annotate',
    warning: 'focus',
    error: 'block'
  }
}

export function createProvinceValidationSnapshot(input: {
  provinces: Iterable<Province>
  terrains: Iterable<TerrainCategory>
  continents: Iterable<Continent>
  geometryByProvinceId?: ReadonlyMap<number, ProvinceGeometryMetrics>
  colorToProvinceIdFromImage?: ReadonlyMap<number, number>
}): ProvinceValidationSnapshot {
  const provinces = new Map<number, Province>()
  const provincesByColor = new Map<number, number>()
  const terrains = new Map<string, TerrainCategory>()
  const continents = new Map<string, Continent>()

  for (const province of input.provinces) {
    provinces.set(province.id, province)
    provincesByColor.set(province.color, province.id)
  }

  for (const terrain of input.terrains) {
    terrains.set(terrain.codeName, terrain)
  }

  for (const continent of input.continents) {
    continents.set(continent.codeName, continent)
  }

  return {
    provinces,
    provincesByColor,
    terrains,
    continents,
    geometryByProvinceId: input.geometryByProvinceId,
    colorToProvinceIdFromImage: input.colorToProvinceIdFromImage
  }
}

export function runProvinceValidation(
  context: ProvinceValidationContext,
  rules: readonly ProvinceValidationRule[],
  policy: ProvinceValidationPolicy = DEFAULT_PROVINCE_VALIDATION_POLICY
): ProvinceValidationResult {
  const findings: ProvinceValidationFinding[] = []

  for (const rule of rules) {
    if (!rule.applies(context)) continue
    const ruleFindings = rule.evaluate(context)
    for (const finding of ruleFindings) {
      findings.push({
        ...finding,
        ruleId: finding.ruleId || rule.id,
        domain: finding.domain || rule.domain
      })
    }
  }

  findings.sort(compareFindings)

  const blockingFindings = findings.filter((finding) => {
    const disposition = finding.suggestedDisposition ?? policy.severityDisposition[finding.severity]
    return disposition === 'block'
  })

  return {
    findings,
    blockingFindings,
    summary: summarizeFindings(findings)
  }
}

export function createProvinceValidationContext(
  snapshot: ProvinceValidationSnapshot
): ProvinceValidationContext {
  return { snapshot }
}

export function createRuleFinding(
  rule: ProvinceValidationRule,
  finding: Omit<ProvinceValidationFinding, 'ruleId' | 'domain'>
): ProvinceValidationFinding {
  return {
    ...finding,
    ruleId: rule.id,
    domain: rule.domain
  }
}

function summarizeFindings(findings: ProvinceValidationFinding[]): ProvinceValidationResult['summary'] {
  let infoCount = 0
  let warningCount = 0
  let errorCount = 0

  for (const finding of findings) {
    if (finding.severity === 'info') infoCount += 1
    else if (finding.severity === 'warning') warningCount += 1
    else errorCount += 1
  }

  return { infoCount, warningCount, errorCount }
}

function compareFindings(a: ProvinceValidationFinding, b: ProvinceValidationFinding): number {
  return compareSeverity(a.severity, b.severity)
    || compareProvinceIds(a.provinceIds, b.provinceIds)
    || a.ruleId.localeCompare(b.ruleId)
    || a.code.localeCompare(b.code)
}

function compareSeverity(a: ProvinceValidationSeverity, b: ProvinceValidationSeverity): number {
  return severityRank(b) - severityRank(a)
}

function severityRank(severity: ProvinceValidationSeverity): number {
  if (severity === 'error') return 3
  if (severity === 'warning') return 2
  return 1
}

function compareProvinceIds(a: number[], b: number[]): number {
  const aMin = Math.min(...a)
  const bMin = Math.min(...b)
  if (aMin !== bMin) return aMin - bMin
  return a.length - b.length
}
