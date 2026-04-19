import { create } from 'zustand'
import type {
  ProvinceValidationIssue,
  ProvinceValidationPhase,
  ProvinceValidationResult,
  ProvinceValidationStatus
} from '../../../../shared/provinceValidation'

interface ProvinceValidationState {
  status: ProvinceValidationStatus
  phase: ProvinceValidationPhase | null
  issues: ProvinceValidationIssue[]
  issuesByProvinceKey: Map<string, ProvinceValidationIssue[]>
  summary: ProvinceValidationResult['summary']
  lastValidatedAt: number | null
  setResult: (result: ProvinceValidationResult) => void
  setProvinceIssues: (
    provinceKey: string,
    issues: ProvinceValidationIssue[],
    phase: ProvinceValidationPhase
  ) => void
  clearProvinceIssues: (provinceKey: string) => void
  clear: () => void
}

const EMPTY_SUMMARY: ProvinceValidationResult['summary'] = {
  infoCount: 0,
  warningCount: 0,
  errorCount: 0
}

export const useProvinceValidationStore = create<ProvinceValidationState>((set) => ({
  status: 'idle',
  phase: null,
  issues: [],
  issuesByProvinceKey: new Map<string, ProvinceValidationIssue[]>(),
  summary: EMPTY_SUMMARY,
  lastValidatedAt: null,

  setResult: (result) => {
    const issuesByProvinceKey = new Map<string, ProvinceValidationIssue[]>()
    for (const issue of result.issues) {
      const existing = issuesByProvinceKey.get(issue.provinceKey) ?? []
      existing.push(issue)
      issuesByProvinceKey.set(issue.provinceKey, existing)
    }

    set({
      status: result.phase === 'full' ? 'full-ready' : 'metadata-ready',
      phase: result.phase,
      issues: result.issues,
      issuesByProvinceKey,
      summary: result.summary,
      lastValidatedAt: Date.now()
    })
  },

  setProvinceIssues: (provinceKey, issues, phase) => set((state) => {
    const issuesByProvinceKey = new Map(state.issuesByProvinceKey)
    if (issues.length === 0) issuesByProvinceKey.delete(provinceKey)
    else issuesByProvinceKey.set(provinceKey, issues)

    const flattenedIssues = flattenIssuesByProvinceKey(issuesByProvinceKey)
    return {
      status: phase === 'full' ? 'full-ready' : 'metadata-ready',
      phase,
      issues: flattenedIssues,
      issuesByProvinceKey,
      summary: summarizeIssues(flattenedIssues),
      lastValidatedAt: Date.now()
    }
  }),

  clearProvinceIssues: (provinceKey) => set((state) => {
    if (!state.issuesByProvinceKey.has(provinceKey)) return state

    const issuesByProvinceKey = new Map(state.issuesByProvinceKey)
    issuesByProvinceKey.delete(provinceKey)
    const flattenedIssues = flattenIssuesByProvinceKey(issuesByProvinceKey)

    return {
      issues: flattenedIssues,
      issuesByProvinceKey,
      summary: summarizeIssues(flattenedIssues),
      lastValidatedAt: Date.now()
    }
  }),

  clear: () => set({
    status: 'idle',
    phase: null,
    issues: [],
    issuesByProvinceKey: new Map<string, ProvinceValidationIssue[]>(),
    summary: EMPTY_SUMMARY,
    lastValidatedAt: null
  })
}))

function flattenIssuesByProvinceKey(
  issuesByProvinceKey: Map<string, ProvinceValidationIssue[]>
): ProvinceValidationIssue[] {
  return [...issuesByProvinceKey.values()]
    .flat()
    .sort(compareIssues)
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

function compareSeverity(a: ProvinceValidationIssue['severity'], b: ProvinceValidationIssue['severity']): number {
  return severityRank(b) - severityRank(a)
}

function severityRank(severity: ProvinceValidationIssue['severity']): number {
  if (severity === 'error') return 3
  if (severity === 'warning') return 2
  return 1
}

function compareProvinceIds(a: number | null, b: number | null): number {
  const left = a ?? Number.MAX_SAFE_INTEGER
  const right = b ?? Number.MAX_SAFE_INTEGER
  return left - right
}
