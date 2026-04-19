import type { Continent, TerrainCategory } from './mapDataTypes'
import type { ProvinceCatalogEntry, ProvinceCatalogEntryKey } from './provinceCatalog'

export type ProvinceValidationSeverity = 'info' | 'warning' | 'error'
export type ProvinceValidationPhase = 'metadata' | 'full'
export type ProvinceValidationStatus = 'idle' | 'metadata-ready' | 'full-ready'

export interface ProvinceValidationSnapshot {
  catalog: readonly ProvinceCatalogEntry[]
  terrains: ReadonlyMap<string, TerrainCategory>
  continents: ReadonlyMap<string, Continent>
}

export interface ProvinceValidationIssue {
  code: string
  severity: ProvinceValidationSeverity
  provinceKey: ProvinceCatalogEntryKey
  provinceId: number | null
  message: string
}

export interface ProvinceValidator {
  id: string
  phase: ProvinceValidationPhase
  validate(snapshot: ProvinceValidationSnapshot): ProvinceValidationIssue[]
}

export interface ProvinceValidationResult {
  phase: ProvinceValidationPhase
  issues: ProvinceValidationIssue[]
  summary: {
    infoCount: number
    warningCount: number
    errorCount: number
  }
}

export function runProvinceValidation(
  snapshot: ProvinceValidationSnapshot,
  validators: readonly ProvinceValidator[],
  phase: ProvinceValidationPhase
): ProvinceValidationResult {
  const issues = validators
    .filter((validator) => validator.phase === phase)
    .flatMap((validator) => validator.validate(snapshot))
    .sort(compareIssues)

  return {
    phase,
    issues,
    summary: summarizeIssues(issues)
  }
}

function summarizeIssues(issues: ProvinceValidationIssue[]): ProvinceValidationResult['summary'] {
  let infoCount = 0
  let warningCount = 0
  let errorCount = 0

  for (const issue of issues) {
    if (issue.severity === 'info') infoCount += 1
    else if (issue.severity === 'warning') warningCount += 1
    else errorCount += 1
  }

  return { infoCount, warningCount, errorCount }
}

function compareIssues(a: ProvinceValidationIssue, b: ProvinceValidationIssue): number {
  return compareSeverity(a.severity, b.severity)
    || compareProvinceIds(a.provinceId, b.provinceId)
    || a.provinceKey.localeCompare(b.provinceKey)
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

function compareProvinceIds(a: number | null, b: number | null): number {
  const left = a ?? Number.MAX_SAFE_INTEGER
  const right = b ?? Number.MAX_SAFE_INTEGER
  return left - right
}
