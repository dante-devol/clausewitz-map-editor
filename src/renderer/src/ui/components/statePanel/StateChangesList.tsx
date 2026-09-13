import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { EntityChangesList } from '../entityPanel/EntityChangesList'

interface Props {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function StateChangesList({ collapsed, onToggleCollapse }: Props): JSX.Element {
  const { t, formatNumber } = useI18n()

  const pendingStateEdits = useMapDataStore((s) => s.pendingStateEdits)
  const statesById = useMapDataStore((s) => s.statesById)
  const selectedStateId = useMapDataStore((s) => s.selectedStateId)
  const setSelectedStateId = useMapDataStore((s) => s.setSelectedStateId)
  const revertStateEdit = useMapDataStore((s) => s.revertStateEdit)

  const entries = [...pendingStateEdits.entries()].map(([stateId, patch]) => {
    const state = statesById.get(stateId)
    return {
      id: stateId,
      name: patch.name ?? state?.displayName ?? String(stateId),
      fieldCount: Object.keys(patch).length
    }
  })

  return (
    <EntityChangesList
      title={t('statePanel.changes.title')}
      entries={entries}
      emptyText={t('statePanel.changes.empty')}
      fieldCountLabel={(count) => t('statePanel.changes.fieldCount', { count })}
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
