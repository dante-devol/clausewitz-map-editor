import type { Province } from '../../../../shared/mapDataTypes'
import type {
  BmpOnlyEntry,
  FieldEdit,
  Reassignment,
  PendingChange,
  ReassignmentAction,
  SelectionOrigin
} from '../../../../shared/provinceEditing'

export function selectPendingChanges(
  pendingEdits: Map<number, Partial<Province>>,
  pendingReassignments: Map<string, ReassignmentAction>,
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
    })
  }

  for (const [guid, action] of pendingReassignments) {
    const entry = bmpOnlyByGuid.get(guid)
    if (!entry) continue
    changes.push({
      kind: 'reassignment',
      changeId: `reassignment:${guid}`,
      guid,
      bmpColor: entry.color,
      action
    })
  }

  return changes
}

export function resolveSelection(
  origin: SelectionOrigin,
  changes: PendingChange[]
): { canonicalId?: number; bmpGuid?: string; changeId?: string } {
  if (origin.list === 'canonical') {
    const change = changes.find(
      (c): c is FieldEdit => c.kind === 'field-edit' && c.provinceId === origin.provinceId
    )
    return { canonicalId: origin.provinceId, changeId: change?.changeId }
  }

  if (origin.list === 'bmp') {
    const change = changes.find(
      (c): c is Reassignment => c.kind === 'reassignment' && c.guid === origin.guid
    )
    return { bmpGuid: origin.guid, changeId: change?.changeId }
  }

  // list === 'changes'
  const change = changes.find((c) => c.changeId === origin.changeId)
  if (!change) return { changeId: origin.changeId }
  if (change.kind === 'field-edit') return { canonicalId: change.provinceId, changeId: change.changeId }
  return { bmpGuid: change.guid, changeId: change.changeId }
}
