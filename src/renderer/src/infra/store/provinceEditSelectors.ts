import type { Province } from '../../../../shared/mapDataTypes'
import type {
  ProvinceCatalogEntry,
  ProvinceBitmapFacts
} from '../../../../shared/provinceCatalog'
import type {
  BmpOnlyEntry,
  BmpFieldEdit,
  BmpReplacement,
  FieldEdit,
  NewProvince,
  PendingChange,
  ProvinceDraftFields,
  ProvinceDraftTarget
} from '../../../../shared/provinceEditing'

export interface ProvinceDraftTargetMaps {
  byProvinceId: Map<number, ProvinceDraftTarget>
  byBmpGuid: Map<string, ProvinceDraftTarget>
  byColor: Map<number, ProvinceDraftTarget>
}

export function selectPendingChanges(
  pendingEdits: Map<number, Partial<ProvinceDraftFields>>,
  pendingBmpOnlyEdits: Map<string, ProvinceDraftFields>,
  bmpReplacements: Map<number, string>,
  pendingNewProvinces: Map<string, number>,
  originalDefinitions: Map<number, Province>,
  bmpOnlyEntries: BmpOnlyEntry[]
): PendingChange[] {
  const changes: PendingChange[] = []
  const bmpOnlyByGuid = new Map(bmpOnlyEntries.map((e) => [e.guid, e]))

  for (const [id, patch] of pendingEdits) {
    const original = originalDefinitions.get(id)
    if (!original) continue
    changes.push({
      kind: 'field-edit',
      changeId: `field-edit:${id}`,
      provinceId: id,
      patch,
      original
    } satisfies FieldEdit)
  }

  for (const [guid, patch] of pendingBmpOnlyEdits) {
    const entry = bmpOnlyByGuid.get(guid)
    if (!entry) continue
    changes.push({
      kind: 'bmp-field-edit',
      changeId: `bmp-field-edit:${guid}`,
      bmpGuid: guid,
      bmpColor: entry.color,
      patch
    } satisfies BmpFieldEdit)
  }

  for (const [provinceId, guid] of bmpReplacements) {
    const original = originalDefinitions.get(provinceId)
    const entry = bmpOnlyByGuid.get(guid)
    if (!original || !entry) continue
    changes.push({
      kind: 'bmp-replacement',
      changeId: `bmp-replacement:${provinceId}`,
      provinceId,
      bmpGuid: guid,
      bmpColor: entry.color,
      original
    } satisfies BmpReplacement)
  }

  for (const [guid, assignedId] of pendingNewProvinces) {
    const entry = bmpOnlyByGuid.get(guid)
    if (!entry) continue
    changes.push({
      kind: 'new-province',
      changeId: `new-province:${guid}`,
      bmpGuid: guid,
      bmpColor: entry.color,
      assignedId
    } satisfies NewProvince)
  }

  return changes
}

export function selectProvinceDraftTargetMaps(
  originalDefinitions: Map<number, Province>,
  pendingEdits: Map<number, Partial<ProvinceDraftFields>>,
  pendingBmpOnlyEdits: Map<string, ProvinceDraftFields>,
  bmpReplacements: Map<number, string>,
  pendingNewProvinces: Map<string, number>,
  bmpOnlyEntries: BmpOnlyEntry[]
): ProvinceDraftTargetMaps {
  const byProvinceId = new Map<number, ProvinceDraftTarget>()
  const byBmpGuid = new Map<string, ProvinceDraftTarget>()
  const byColor = new Map<number, ProvinceDraftTarget>()
  const bmpOnlyByGuid = new Map(bmpOnlyEntries.map((entry) => [entry.guid, entry]))
  const assignedGuids = new Set<string>([...bmpReplacements.values(), ...pendingNewProvinces.keys()])

  for (const [id, original] of originalDefinitions) {
    const patch = pendingEdits.get(id) ?? {}
    const replacingGuid = bmpReplacements.get(id)
    const bmpColor = replacingGuid ? bmpOnlyByGuid.get(replacingGuid)?.color : undefined
    const target: ProvinceDraftTarget = {
      provinceId: id,
      bmpGuid: replacingGuid ?? null,
      color: bmpColor ?? original.color,
      type: applyDraftFieldPatch(patch, 'type', original.type),
      isCoastal: applyDraftFieldPatch(patch, 'isCoastal', original.isCoastal),
      terrain: applyDraftFieldPatch(patch, 'terrain', original.terrain),
      continent: applyDraftFieldPatch(patch, 'continent', original.continent),
      source: 'canonical',
      status: replacingGuid ? 'replacement' : 'canonical'
    }
    byProvinceId.set(id, target)
    byColor.set(target.color, target)
    if (replacingGuid) byBmpGuid.set(replacingGuid, target)
  }

  for (const [guid, assignedId] of pendingNewProvinces) {
    const entry = bmpOnlyByGuid.get(guid)
    if (!entry) continue
    const patch = pendingEdits.get(assignedId) ?? {}
    const target: ProvinceDraftTarget = {
      provinceId: assignedId,
      bmpGuid: guid,
      color: entry.color,
      type: patch.type,
      isCoastal: patch.isCoastal,
      terrain: patch.terrain,
      continent: patch.continent,
      source: 'bmp-only',
      status: 'registered'
    }
    byProvinceId.set(assignedId, target)
    byBmpGuid.set(guid, target)
    byColor.set(entry.color, target)
  }

  for (const entry of bmpOnlyEntries) {
    if (assignedGuids.has(entry.guid)) continue
    const patch = pendingBmpOnlyEdits.get(entry.guid) ?? createEmptyDraftFields()
    const target: ProvinceDraftTarget = {
      provinceId: null,
      bmpGuid: entry.guid,
      color: entry.color,
      ...patch,
      source: 'bmp-only',
      status: 'unregistered'
    }
    byBmpGuid.set(entry.guid, target)
    byColor.set(entry.color, target)
  }

  return { byProvinceId, byBmpGuid, byColor }
}

export function selectEffectiveProvincesForSave(
  originalDefinitions: Map<number, Province>,
  pendingEdits: Map<number, Partial<ProvinceDraftFields>>,
  pendingBmpOnlyEdits: Map<string, ProvinceDraftFields>,
  bmpReplacements: Map<number, string>,
  pendingNewProvinces: Map<string, number>,
  bmpOnlyEntries: BmpOnlyEntry[],
  normalizeMissingFields: boolean
): Province[] {
  const { byProvinceId } = selectProvinceDraftTargetMaps(
    originalDefinitions,
    pendingEdits,
    pendingBmpOnlyEdits,
    bmpReplacements,
    pendingNewProvinces,
    bmpOnlyEntries
  )

  return [...byProvinceId.values()]
    .sort((a, b) => (a.provinceId ?? 0) - (b.provinceId ?? 0))
    .map((target) => materializeProvinceDraftTarget(target, normalizeMissingFields))
}

export function selectIncompleteProvinceDraftTargets(
  originalDefinitions: Map<number, Province>,
  pendingEdits: Map<number, Partial<ProvinceDraftFields>>,
  pendingBmpOnlyEdits: Map<string, ProvinceDraftFields>,
  bmpReplacements: Map<number, string>,
  pendingNewProvinces: Map<string, number>,
  bmpOnlyEntries: BmpOnlyEntry[]
): ProvinceDraftTarget[] {
  const { byProvinceId } = selectProvinceDraftTargetMaps(
    originalDefinitions,
    pendingEdits,
    pendingBmpOnlyEdits,
    bmpReplacements,
    pendingNewProvinces,
    bmpOnlyEntries
  )

  return [...byProvinceId.values()]
    .filter((target) => (
      target.type === undefined
      || target.isCoastal === undefined
      || target.terrain === undefined
      || target.continent === undefined
    ))
    .sort((a, b) => (a.provinceId ?? 0) - (b.provinceId ?? 0))
}

export function selectEffectiveProvinceCatalog(
  originalDefinitions: Map<number, Province>,
  pendingEdits: Map<number, Partial<ProvinceDraftFields>>,
  pendingBmpOnlyEdits: Map<string, ProvinceDraftFields>,
  bmpReplacements: Map<number, string>,
  pendingNewProvinces: Map<string, number>,
  bmpOnlyEntries: BmpOnlyEntry[],
  provinceCatalog: readonly ProvinceCatalogEntry[]
): ProvinceCatalogEntry[] {
  const { byProvinceId, byBmpGuid } = selectProvinceDraftTargetMaps(
    originalDefinitions,
    pendingEdits,
    pendingBmpOnlyEdits,
    bmpReplacements,
    pendingNewProvinces,
    bmpOnlyEntries
  )
  const bitmapFacts = selectBitmapFactsFromCatalog(provinceCatalog)
  const remainingColors = bitmapFacts ? new Map(bitmapFacts.byColor) : new Map<number, NonNullable<ProvinceCatalogEntry['bitmapFact']>>()
  const entriesById = new Map<number, ProvinceCatalogEntry>()

  for (const target of byProvinceId.values()) {
    if (target.provinceId === null) continue
    const bitmapFact = remainingColors.get(target.color)
    if (bitmapFact) remainingColors.delete(target.color)
    entriesById.set(target.provinceId, {
      key: `definition:${target.provinceId}`,
      id: target.provinceId,
      color: target.color,
      type: target.type ?? null,
      isCoastal: target.isCoastal ?? null,
      terrain: target.terrain ?? null,
      continent: target.continent ?? null,
      canonical: true,
      sources: ['definitions'],
      mapPresence: bitmapFact ? 'present' : 'missing',
      bitmapFact
    })
  }

  const sortedIds = [...entriesById.keys()].sort((a, b) => a - b)
  const catalog: ProvinceCatalogEntry[] = []

  for (let index = 0; index < sortedIds.length; index++) {
    const id = sortedIds[index]
    if (index > 0) {
      for (let missingId = sortedIds[index - 1] + 1; missingId < id; missingId++) {
        catalog.push({
          key: `gap:${missingId}`,
          id: missingId,
          color: null,
          type: null,
          isCoastal: null,
          terrain: null,
          continent: null,
          canonical: false,
          sources: ['id-gap'],
          mapPresence: 'unknown'
        })
      }
    }
    catalog.push(entriesById.get(id)!)
  }

  for (const entry of bmpOnlyEntries) {
    const target = byBmpGuid.get(entry.guid)
    const bitmapFact = remainingColors.get(entry.color)
    if (bitmapFact) remainingColors.delete(entry.color)
    if (!target || target.status !== 'unregistered') continue
    catalog.push({
      key: `bmp:${entry.color}`,
      id: null,
      color: entry.color,
      type: target.type ?? null,
      isCoastal: target.isCoastal ?? null,
      terrain: target.terrain ?? null,
      continent: target.continent ?? null,
      canonical: false,
      sources: ['bmp-color'],
      mapPresence: 'present',
      bitmapFact
    })
  }

  for (const bitmapFact of remainingColors.values()) {
    catalog.push({
      key: `bmp:${bitmapFact.color}`,
      id: null,
      color: bitmapFact.color,
      type: null,
      isCoastal: null,
      terrain: null,
      continent: null,
      canonical: false,
      sources: ['bmp-color'],
      mapPresence: 'present',
      bitmapFact
    })
  }

  return catalog.sort(compareCatalogEntries)
}

function materializeProvinceDraftTarget(
  target: ProvinceDraftTarget,
  normalizeMissingFields: boolean
): Province {
  if (target.provinceId === null) {
    throw new Error('Cannot materialize an unregistered province draft without an ID')
  }

  return {
    id: target.provinceId,
    color: target.color,
    type: target.type ?? (normalizeMissingFields ? 'sea' : failMissingField('type', target)),
    isCoastal: target.isCoastal ?? (normalizeMissingFields ? false : failMissingField('isCoastal', target)),
    terrain: target.terrain ?? (normalizeMissingFields ? 'unknown' : failMissingField('terrain', target)),
    continent: target.continent ?? (normalizeMissingFields ? '' : failMissingField('continent', target))
  }
}

function failMissingField(
  field: keyof ProvinceDraftFields,
  target: ProvinceDraftTarget
): never {
  throw new Error(`Cannot materialize province ${target.provinceId ?? target.bmpGuid ?? '?'} with missing field ${field}`)
}

function selectBitmapFactsFromCatalog(
  provinceCatalog: readonly ProvinceCatalogEntry[]
): ProvinceBitmapFacts | null {
  const byColor = new Map<number, NonNullable<ProvinceCatalogEntry['bitmapFact']>>()

  for (const entry of provinceCatalog) {
    if (!entry.bitmapFact) continue
    byColor.set(entry.bitmapFact.color, entry.bitmapFact)
  }

  if (byColor.size === 0) return null
  return {
    colors: [...byColor.keys()].sort((a, b) => a - b),
    byColor
  }
}

function compareCatalogEntries(a: ProvinceCatalogEntry, b: ProvinceCatalogEntry): number {
  const aId = a.id ?? Number.MAX_SAFE_INTEGER
  const bId = b.id ?? Number.MAX_SAFE_INTEGER
  if (aId !== bId) return aId - bId

  const aColor = a.color ?? Number.MAX_SAFE_INTEGER
  const bColor = b.color ?? Number.MAX_SAFE_INTEGER
  if (aColor !== bColor) return aColor - bColor

  return a.key.localeCompare(b.key)
}

function createEmptyDraftFields(): ProvinceDraftFields {
  return {
    type: undefined,
    isCoastal: undefined,
    terrain: undefined,
    continent: undefined
  }
}

function applyDraftFieldPatch<K extends keyof ProvinceDraftFields>(
  patch: Partial<ProvinceDraftFields>,
  field: K,
  originalValue: ProvinceDraftFields[K]
): ProvinceDraftFields[K] {
  return Object.prototype.hasOwnProperty.call(patch, field)
    ? patch[field]
    : originalValue
}
