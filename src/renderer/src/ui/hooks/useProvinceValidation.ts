import { useEffect, useMemo, useRef } from 'react'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { useProvinceValidationStore } from '../../infra/store/provinceValidationStore'
import { provinceValidators } from '../../infra/validation/provinceValidators'
import {
  runProvinceValidation,
  runProvinceValidationForProvince,
  type ProvinceValidationSnapshot
} from '../../../../shared/provinceValidation'
import { selectEffectiveProvinceCatalog } from '../../infra/store/provinceEditSelectors'
import type { ProvinceCatalogEntry, ProvinceCatalogEntryKey } from '../../../../shared/provinceCatalog'
import { notificationService } from '../../infra/services/notificationService'
import { useI18n } from '../i18n/I18nProvider'

export function useProvinceValidation(): void {
  const { t } = useI18n()
  const provinceCatalog = useMapDataStore((s) => s.provinceCatalog)
  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const pendingEdits = useMapDataStore((s) => s.pendingEdits)
  const pendingBmpOnlyEdits = useMapDataStore((s) => s.pendingBmpOnlyEdits)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const pendingNewProvinces = useMapDataStore((s) => s.pendingNewProvinces)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const provinceBitmapStatus = useMapDataStore((s) => s.provinceBitmapStatus)
  const setResult = useProvinceValidationStore((s) => s.setResult)
  const setProvinceIssues = useProvinceValidationStore((s) => s.setProvinceIssues)
  const clearProvinceIssues = useProvinceValidationStore((s) => s.clearProvinceIssues)
  const clear = useProvinceValidationStore((s) => s.clear)
  const previousValidationRef = useRef<{
    baseSignature: string
    byKey: Map<ProvinceCatalogEntryKey, ProvinceCatalogEntry>
  } | null>(null)
  const previousFullValidationSignatureRef = useRef<string | null>(null)

  const effectiveCatalog = useMemo(
    () => selectEffectiveProvinceCatalog(
      originalDefinitions,
      pendingEdits,
      pendingBmpOnlyEdits,
      bmpReplacements,
      pendingNewProvinces,
      bmpOnlyEntries,
      provinceCatalog
    ),
    [originalDefinitions, pendingEdits, pendingBmpOnlyEdits, bmpReplacements, pendingNewProvinces, bmpOnlyEntries, provinceCatalog]
  )

  const snapshot = useMemo<ProvinceValidationSnapshot>(() => ({
    catalog: effectiveCatalog,
    catalogByKey: new Map(effectiveCatalog.map((entry) => [entry.key, entry])),
    terrains,
    continents
  }), [continents, effectiveCatalog, terrains])

  useEffect(() => {
    const baseSignature = [
      provinceCatalog.length,
      terrains.size,
      continents.size,
      provinceBitmapStatus
    ].join(':')
    const currentByKey = snapshot.catalogByKey
    const previous = previousValidationRef.current

    if (!previous || previous.baseSignature !== baseSignature) {
      const result = runValidationForCatalog(snapshot, provinceBitmapStatus === 'ready')
      setResult(result)
      if (result.phase === 'full') {
        const signature = `${baseSignature}:${result.summary.infoCount}:${result.summary.warningCount}:${result.summary.errorCount}`
        if (previousFullValidationSignatureRef.current !== signature) {
          previousFullValidationSignatureRef.current = signature
          notificationService.pushAck({
            id: 'validation:full',
            scope: 'validation:full',
            title: t('notification.validation.title'),
            message: formatValidationSummaryMessage(t, result.summary),
            tone: result.summary.errorCount > 0 ? 'error' : (result.summary.warningCount > 0 ? 'warning' : 'success')
          })
        }
      }
      previousValidationRef.current = { baseSignature, byKey: new Map(currentByKey) }
      return
    }

    const changedKeys = new Set<ProvinceCatalogEntryKey>()

    for (const [key, entry] of currentByKey) {
      const previousEntry = previous.byKey.get(key)
      if (!previousEntry || !sameCatalogEntryForValidation(previousEntry, entry)) {
        changedKeys.add(key)
      }
    }

    for (const key of previous.byKey.keys()) {
      if (!currentByKey.has(key)) {
        clearProvinceIssues(key)
      }
    }

    const isFull = provinceBitmapStatus === 'ready'
    for (const key of changedKeys) {
      setProvinceIssues(key, runValidationForProvince(snapshot, isFull, key), isFull ? 'full' : 'metadata')
    }

    previousValidationRef.current = { baseSignature, byKey: new Map(currentByKey) }
  }, [
    clearProvinceIssues,
    continents.size,
    provinceBitmapStatus,
    provinceCatalog.length,
    setProvinceIssues,
    setResult,
    snapshot,
    terrains.size
  ])

  useEffect(() => clear, [clear])
}

function runValidationForCatalog(
  snapshot: ProvinceValidationSnapshot,
  includeFullPhase: boolean
) {
  const metadataResult = runProvinceValidation(snapshot, provinceValidators, 'metadata')
  if (!includeFullPhase) return metadataResult

  const fullResult = runProvinceValidation(snapshot, provinceValidators, 'full')
  return {
    phase: 'full' as const,
    issues: [...metadataResult.issues, ...fullResult.issues],
    summary: {
      infoCount: metadataResult.summary.infoCount + fullResult.summary.infoCount,
      warningCount: metadataResult.summary.warningCount + fullResult.summary.warningCount,
      errorCount: metadataResult.summary.errorCount + fullResult.summary.errorCount
    }
  }
}

function runValidationForProvince(
  snapshot: ProvinceValidationSnapshot,
  includeFullPhase: boolean,
  provinceKey: ProvinceCatalogEntryKey
): import('../../../../shared/provinceValidation').ProvinceValidationIssue[] {
  const metadataResult = runProvinceValidationForProvince(snapshot, provinceValidators, 'metadata', provinceKey)
  if (!includeFullPhase) return metadataResult.issues

  const fullResult = runProvinceValidationForProvince(snapshot, provinceValidators, 'full', provinceKey)
  return [...metadataResult.issues, ...fullResult.issues]
}

function sameCatalogEntryForValidation(a: ProvinceCatalogEntry, b: ProvinceCatalogEntry): boolean {
  return a.id === b.id
    && a.color === b.color
    && a.type === b.type
    && a.isCoastal === b.isCoastal
    && a.terrain === b.terrain
    && a.continent === b.continent
    && a.mapPresence === b.mapPresence
    && sameSources(a.sources, b.sources)
}

function sameSources(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function formatValidationSummaryMessage(
  t: (key: string, params?: Record<string, string | number>) => string,
  summary: { infoCount: number; warningCount: number; errorCount: number }
): string {
  if (summary.errorCount === 0 && summary.warningCount === 0) {
    return t('notification.validation.clean')
  }

  return t('notification.validation.summary', {
    errors: summary.errorCount,
    warnings: summary.warningCount
  })
}
