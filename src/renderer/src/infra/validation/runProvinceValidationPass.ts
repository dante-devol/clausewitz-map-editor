import { provinceValidators } from './provinceValidators'
import {
  runProvinceValidation,
  runProvinceValidationForProvince,
  type ProvinceValidationIssue,
  type ProvinceValidationResult,
  type ProvinceValidationSnapshot
} from '../../../../shared/provinceValidation'
import type { ProvinceCatalogEntryKey } from '../../../../shared/provinceCatalog'

// The actual validator execution (potentially O(provinces) or worse per
// validator) — pulled out of useProvinceValidation.ts so it can run inside
// provinceValidation.worker.ts, off the main thread, instead of blocking
// render on every edit. Pure and worker-safe: no DOM, no store access, just
// the snapshot it's given.
export function runValidationForCatalog(
  snapshot: ProvinceValidationSnapshot,
  includeFullPhase: boolean
): ProvinceValidationResult {
  const metadataResult = runProvinceValidation(snapshot, provinceValidators, 'metadata')
  if (!includeFullPhase) return metadataResult

  const fullResult = runProvinceValidation(snapshot, provinceValidators, 'full')
  return {
    phase: 'full',
    issues: [...metadataResult.issues, ...fullResult.issues],
    summary: {
      infoCount: metadataResult.summary.infoCount + fullResult.summary.infoCount,
      warningCount: metadataResult.summary.warningCount + fullResult.summary.warningCount,
      errorCount: metadataResult.summary.errorCount + fullResult.summary.errorCount
    }
  }
}

export function runValidationForProvince(
  snapshot: ProvinceValidationSnapshot,
  includeFullPhase: boolean,
  provinceKey: ProvinceCatalogEntryKey
): ProvinceValidationIssue[] {
  const metadataResult = runProvinceValidationForProvince(snapshot, provinceValidators, 'metadata', provinceKey)
  if (!includeFullPhase) return metadataResult.issues

  const fullResult = runProvinceValidationForProvince(snapshot, provinceValidators, 'full', provinceKey)
  return [...metadataResult.issues, ...fullResult.issues]
}
