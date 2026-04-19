import type { Province } from '../../../../shared/mapDataTypes'
import type {
  BmpOnlyEntry,
  FieldEdit,
  BmpReplacement,
  NewProvince,
  PendingChange,
  SelectionOrigin
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

export function resolveSelection(
  origin: SelectionOrigin,
  changes: PendingChange[]
): { canonicalId?: number; bmpGuid?: string; changeId?: string } {
  if (origin.list === 'canonical') {
    const replacement = changes.find(
      (c): c is BmpReplacement => c.kind === 'bmp-replacement' && c.provinceId === origin.provinceId
    )
    const edit = changes.find(
      (c): c is FieldEdit => c.kind === 'field-edit' && c.provinceId === origin.provinceId
    )
    return {
      canonicalId: origin.provinceId,
      bmpGuid: replacement?.bmpGuid,
      changeId: replacement?.changeId ?? edit?.changeId
    }
  }

  if (origin.list === 'bmp') {
    const replacement = changes.find(
      (c): c is BmpReplacement => c.kind === 'bmp-replacement' && c.bmpGuid === origin.guid
    )
    const newProv = changes.find(
      (c): c is NewProvince => c.kind === 'new-province' && c.bmpGuid === origin.guid
    )
    return {
      bmpGuid: origin.guid,
      canonicalId: replacement?.provinceId,
      changeId: replacement?.changeId ?? newProv?.changeId
    }
  }

  // list === 'changes'
  const change = changes.find((c) => c.changeId === origin.changeId)
  if (!change) return { changeId: origin.changeId }
  if (change.kind === 'field-edit') {
    return { canonicalId: change.provinceId, changeId: change.changeId }
  }
  if (change.kind === 'bmp-replacement') {
    return { canonicalId: change.provinceId, bmpGuid: change.bmpGuid, changeId: change.changeId }
  }
  // new-province
  return { bmpGuid: change.bmpGuid, changeId: change.changeId }
}
