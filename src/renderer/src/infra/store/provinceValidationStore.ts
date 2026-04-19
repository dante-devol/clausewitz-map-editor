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

  clear: () => set({
    status: 'idle',
    phase: null,
    issues: [],
    issuesByProvinceKey: new Map<string, ProvinceValidationIssue[]>(),
    summary: EMPTY_SUMMARY,
    lastValidatedAt: null
  })
}))
