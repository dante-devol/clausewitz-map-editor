import { useEffect, useMemo, useRef } from 'react'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { useProvinceValidationStore } from '../../infra/store/provinceValidationStore'
import type { ProvinceValidationSnapshot } from '../../../../shared/provinceValidation'
import { selectEffectiveProvinceCatalog } from '../../infra/store/provinceEditSelectors'
import type { ProvinceCatalogEntry, ProvinceCatalogEntryKey } from '../../../../shared/provinceCatalog'
import { notificationService } from '../../infra/services/notificationService'
import { useI18n, type MessageParams } from '../i18n/I18nProvider'
import type { MessageKey } from '../i18n/messages/en'
import type { ProvinceValidationWorkerRequest, ProvinceValidationWorkerResponse } from '../../infra/workers/provinceValidation.worker'
import { profilerStart, profilerEnd } from '../../infra/lib/profiler'
import { log } from '../../infra/lib/logger'

// Validators run off the main thread (provinceValidation.worker.ts) and are
// debounced: a burst of rapid edits (typing, a paint drag, a batch move)
// schedules one validation pass after the edits settle, instead of one pass
// per store update. Changed province keys are accumulated across the
// debounce window (pendingChangedKeysRef) so a delayed pass still covers
// every edit made during it, not just the last one.
const VALIDATION_DEBOUNCE_MS = 250

export function useProvinceValidation(): void {
  const { t } = useI18n()
  const tRef = useRef(t)
  useEffect(() => { tRef.current = t }, [t])

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

  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)
  const pendingRequestBaseSignatureRef = useRef<string | null>(null)
  const pendingFullRef = useRef(false)
  const pendingChangedKeysRef = useRef(new Set<ProvinceCatalogEntryKey>())
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // One worker for the hook's lifetime — validation runs repeatedly as edits
  // come in, so spawning/terminating a worker per pass would just move the
  // cost from "blocking the main thread" to "constant worker startup".
  useEffect(() => {
    const worker = new Worker(
      new URL('../../infra/workers/provinceValidation.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    worker.onerror = (e: ErrorEvent) => {
      // Previously silent: a thrown error inside the worker had nowhere to
      // go, so a validation pass could just vanish with no trace.
      log.error('Province validation worker error', { message: e.message, filename: e.filename, lineno: e.lineno })
    }
    worker.onmessage = (e: MessageEvent<ProvinceValidationWorkerResponse>) => {
      const msg = e.data
      profilerEnd('validation', `validation:${msg.requestId}`)
      if (msg.requestId !== requestIdRef.current) return // superseded by a newer request

      if (msg.kind === 'full') {
        setResult(msg.result)
        if (msg.result.phase === 'full') {
          const baseSignature = pendingRequestBaseSignatureRef.current
          const signature = `${baseSignature}:${msg.result.summary.infoCount}:${msg.result.summary.warningCount}:${msg.result.summary.errorCount}`
          if (previousFullValidationSignatureRef.current !== signature) {
            previousFullValidationSignatureRef.current = signature
            notificationService.pushAck({
              id: 'validation:full',
              scope: 'validation:full',
              title: tRef.current('notification.validation.title'),
              message: formatValidationSummaryMessage(tRef.current, msg.result.summary),
              tone: msg.result.summary.errorCount > 0 ? 'error' : (msg.result.summary.warningCount > 0 ? 'warning' : 'success')
            })
          }
        }
        return
      }

      for (const entry of msg.entries) {
        setProvinceIssues(entry.key, entry.issues, msg.phase)
      }
    }
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [setProvinceIssues, setResult])

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
    const isFull = provinceBitmapStatus === 'ready'

    if (!previous || previous.baseSignature !== baseSignature) {
      pendingFullRef.current = true
    } else {
      for (const [key, entry] of currentByKey) {
        const previousEntry = previous.byKey.get(key)
        if (!previousEntry || !sameCatalogEntryForValidation(previousEntry, entry)) {
          pendingChangedKeysRef.current.add(key)
        }
      }
      // Removed keys need no (re)validation — clear them immediately rather
      // than waiting on the debounce, so a deleted province's issues never
      // linger on screen even briefly.
      for (const key of previous.byKey.keys()) {
        if (!currentByKey.has(key)) {
          clearProvinceIssues(key)
          pendingChangedKeysRef.current.delete(key)
        }
      }
    }

    previousValidationRef.current = { baseSignature, byKey: new Map(currentByKey) }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      const worker = workerRef.current
      if (!worker) return

      const requestId = ++requestIdRef.current
      if (pendingFullRef.current) {
        pendingFullRef.current = false
        pendingChangedKeysRef.current.clear()
        pendingRequestBaseSignatureRef.current = baseSignature
        profilerStart(`validation:${requestId}`)
        worker.postMessage({
          kind: 'full',
          requestId,
          snapshot,
          includeFullPhase: isFull
        } satisfies ProvinceValidationWorkerRequest)
      } else if (pendingChangedKeysRef.current.size > 0) {
        const keys = [...pendingChangedKeysRef.current]
        pendingChangedKeysRef.current.clear()
        profilerStart(`validation:${requestId}`)
        worker.postMessage({
          kind: 'incremental',
          requestId,
          snapshot,
          includeFullPhase: isFull,
          keys
        } satisfies ProvinceValidationWorkerRequest)
      }
    }, VALIDATION_DEBOUNCE_MS)
  }, [
    clearProvinceIssues,
    continents.size,
    provinceBitmapStatus,
    provinceCatalog.length,
    snapshot,
    terrains.size
  ])

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
  }, [])

  useEffect(() => clear, [clear])
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
  t: (key: MessageKey, params?: MessageParams) => string,
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
