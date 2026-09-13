import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { EntityChangesList, type EntityChangeEntry, type EntityChangeKind } from '../entityPanel/EntityChangesList'

interface Props {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function StateChangesList({ collapsed, onToggleCollapse }: Props): JSX.Element {
  const { t, formatNumber } = useI18n()

  const pendingStateEdits = useMapDataStore((s) => s.pendingStateEdits)
  const pendingNewStates = useMapDataStore((s) => s.pendingNewStates)
  const pendingStateDeletions = useMapDataStore((s) => s.pendingStateDeletions)
  const statesById = useMapDataStore((s) => s.statesById)
  const selectedStateId = useMapDataStore((s) => s.selectedStateId)
  const setSelectedStateId = useMapDataStore((s) => s.setSelectedStateId)
  const revertStateEdit = useMapDataStore((s) => s.revertStateEdit)

  const newEntries: EntityChangeEntry[] = [...pendingNewStates.entries()].map(([stateId, state]) => ({
    id: stateId,
    name: pendingStateEdits.get(stateId)?.name ?? state.displayName,
    fieldCount: 0,
    kind: 'new'
  }))

  const editEntries: EntityChangeEntry[] = [...pendingStateEdits.entries()]
    .filter(([stateId]) => !pendingNewStates.has(stateId))
    .map(([stateId, patch]) => {
      const state = statesById.get(stateId)
      return {
        id: stateId,
        name: patch.name ?? state?.displayName ?? String(stateId),
        fieldCount: Object.keys(patch).length,
        kind: 'edit'
      }
    })

  const deleteEntries: EntityChangeEntry[] = [...pendingStateDeletions].map((stateId) => ({
    id: stateId,
    name: statesById.get(stateId)?.displayName ?? String(stateId),
    fieldCount: 0,
    kind: 'delete'
  }))

  const entries = [...newEntries, ...editEntries, ...deleteEntries]

  const kindLabels: Record<EntityChangeKind, string> = {
    edit: t('entityChanges.kind.edit'),
    new: t('entityChanges.kind.new'),
    delete: t('entityChanges.kind.delete')
  }

  return (
    <EntityChangesList
      title={t('statePanel.changes.title')}
      entries={entries}
      emptyText={t('statePanel.changes.empty')}
      fieldCountLabel={(count) => t('statePanel.changes.fieldCount', { count })}
      kindLabel={(kind) => kindLabels[kind]}
      revertLabel={t('provincePanel.changes.revert')}
      selectedId={selectedStateId}
      onSelect={setSelectedStateId}
      onRevert={revertStateEdit}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      formatCount={formatNumber}
    />
  )
}
