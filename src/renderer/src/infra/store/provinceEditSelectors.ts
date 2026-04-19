import type { Province } from '../../../../shared/mapDataTypes'
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
