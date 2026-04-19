import type { Province } from '../../../../shared/mapDataTypes'
import type { Continent } from '../../../../shared/mapDataTypes'
import {
  buildProvinceCatalog,
  reconcileProvinceCatalogWithBitmap,
  type ProvinceBitmapFacts,
  type ProvinceCatalogEntry
} from '../../../../shared/provinceCatalog'
import type {
  BmpOnlyEntry,
  FieldEdit,
  BmpReplacement,
  NewProvince,
  PendingChange
} from '../../../../shared/provinceEditing'

export function selectPendingChanges(
  pendingEdits: Map<number, Partial<Province>>,
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

export function selectEffectiveProvinces(
  originalDefinitions: Map<number, Province>,
  pendingEdits: Map<number, Partial<Province>>,
  bmpReplacements: Map<number, string>,
  pendingNewProvinces: Map<string, number>,
  bmpOnlyEntries: BmpOnlyEntry[]
): Province[] {
  const provinces: Province[] = []
  const bmpOnlyByGuid = new Map(bmpOnlyEntries.map((entry) => [entry.guid, entry]))

  for (const [id, original] of originalDefinitions) {
    const patch = pendingEdits.get(id) ?? {}
    const replacingGuid = bmpReplacements.get(id)
    const bmpColor = replacingGuid ? bmpOnlyByGuid.get(replacingGuid)?.color : undefined
    provinces.push({
      ...original,
      ...patch,
      ...(bmpColor !== undefined ? { color: bmpColor } : {})
    })
  }

  for (const [guid, assignedId] of pendingNewProvinces) {
    const bmpColor = bmpOnlyByGuid.get(guid)?.color
    if (bmpColor === undefined) continue
    provinces.push({
      id: assignedId,
      color: bmpColor,
      type: 'land',
      isCoastal: false,
      terrain: '',
      continent: '',
      ...(pendingEdits.get(assignedId) ?? {})
    })
  }

  return provinces.sort((a, b) => a.id - b.id)
}

export function selectEffectiveProvinceCatalog(
  originalDefinitions: Map<number, Province>,
  pendingEdits: Map<number, Partial<Province>>,
  bmpReplacements: Map<number, string>,
  pendingNewProvinces: Map<string, number>,
  bmpOnlyEntries: BmpOnlyEntry[],
  provinceCatalog: readonly ProvinceCatalogEntry[]
): ProvinceCatalogEntry[] {
  const effectiveProvinces = selectEffectiveProvinces(
    originalDefinitions,
    pendingEdits,
    bmpReplacements,
    pendingNewProvinces,
    bmpOnlyEntries
  )

  const bitmapFacts = selectBitmapFactsFromCatalog(provinceCatalog)
  const catalog = buildProvinceCatalog(effectiveProvinces)
  return bitmapFacts ? reconcileProvinceCatalogWithBitmap(catalog, bitmapFacts) : catalog
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
