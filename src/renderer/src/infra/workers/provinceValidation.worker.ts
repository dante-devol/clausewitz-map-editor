import { runValidationForCatalog, runValidationForProvince } from '../validation/runProvinceValidationPass'
import type { ProvinceValidationIssue, ProvinceValidationPhase, ProvinceValidationResult, ProvinceValidationSnapshot } from '../../../../shared/provinceValidation'
import type { ProvinceCatalogEntryKey } from '../../../../shared/provinceCatalog'

// Runs the actual province validators off the main thread. The snapshot
// (catalog array + terrains/continents Maps, all plain data) structured-clones
// fine over postMessage; requestId lets the caller discard a reply that's been
// superseded by a newer request instead of applying stale results.
export type ProvinceValidationWorkerRequest =
  | { kind: 'full'; requestId: number; snapshot: ProvinceValidationSnapshot; includeFullPhase: boolean }
  | {
      kind: 'incremental'
      requestId: number
      snapshot: ProvinceValidationSnapshot
      includeFullPhase: boolean
      keys: ProvinceCatalogEntryKey[]
    }

export type ProvinceValidationWorkerResponse =
  | { kind: 'full'; requestId: number; result: ProvinceValidationResult }
  | {
      kind: 'incremental'
      requestId: number
      phase: ProvinceValidationPhase
      entries: { key: ProvinceCatalogEntryKey; issues: ProvinceValidationIssue[] }[]
    }

self.onmessage = (event: MessageEvent<ProvinceValidationWorkerRequest>) => {
  const msg = event.data
  if (msg.kind === 'full') {
    const result = runValidationForCatalog(msg.snapshot, msg.includeFullPhase)
    self.postMessage({ kind: 'full', requestId: msg.requestId, result } satisfies ProvinceValidationWorkerResponse)
    return
  }

  const entries = msg.keys.map((key) => ({
    key,
    issues: runValidationForProvince(msg.snapshot, msg.includeFullPhase, key)
  }))
  self.postMessage({
    kind: 'incremental',
    requestId: msg.requestId,
    phase: msg.includeFullPhase ? 'full' : 'metadata',
    entries
  } satisfies ProvinceValidationWorkerResponse)
}
