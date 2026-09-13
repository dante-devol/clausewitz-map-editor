import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { EntityChangesList } from '../entityPanel/EntityChangesList'

interface Props {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function StrategicRegionChangesList({ collapsed, onToggleCollapse }: Props): JSX.Element {
  const { t, formatNumber } = useI18n()

  const pendingStrategicRegionEdits = useMapDataStore((s) => s.pendingStrategicRegionEdits)
  const strategicRegionsById = useMapDataStore((s) => s.strategicRegionsById)
  const selectedStrategicRegionId = useMapDataStore((s) => s.selectedStrategicRegionId)
  const setSelectedStrategicRegionId = useMapDataStore((s) => s.setSelectedStrategicRegionId)
  const revertStrategicRegionEdit = useMapDataStore((s) => s.revertStrategicRegionEdit)

  const entries = [...pendingStrategicRegionEdits.entries()].map(([regionId, patch]) => {
    const region = strategicRegionsById.get(regionId)
    return {
      id: regionId,
      name: patch.name ?? region?.displayName ?? String(regionId),
      fieldCount: Object.keys(patch).length
    }
  })

  return (
    <EntityChangesList
      title={t('stratRegionPanel.changes.title')}
      entries={entries}
      emptyText={t('stratRegionPanel.changes.empty')}
      fieldCountLabel={(count) => t('stratRegionPanel.changes.fieldCount', { count })}
      revertLabel={t('provincePanel.changes.revert')}
      selectedId={selectedStrategicRegionId}
      onSelect={setSelectedStrategicRegionId}
      onRevert={revertStrategicRegionEdit}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      formatCount={formatNumber}
    />
  )
}
