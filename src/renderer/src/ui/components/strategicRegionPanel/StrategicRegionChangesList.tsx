import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { EntityChangesList, type EntityChangeEntry, type EntityChangeKind } from '../entityPanel/EntityChangesList'

interface Props {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function StrategicRegionChangesList({ collapsed, onToggleCollapse }: Props): JSX.Element {
  const { t, formatNumber } = useI18n()

  const pendingStrategicRegionEdits = useMapDataStore((s) => s.pendingStrategicRegionEdits)
  const pendingNewStrategicRegions = useMapDataStore((s) => s.pendingNewStrategicRegions)
  const pendingStrategicRegionDeletions = useMapDataStore((s) => s.pendingStrategicRegionDeletions)
  const strategicRegionsById = useMapDataStore((s) => s.strategicRegionsById)
  const selectedStrategicRegionId = useMapDataStore((s) => s.selectedStrategicRegionId)
  const setSelectedStrategicRegionId = useMapDataStore((s) => s.setSelectedStrategicRegionId)
  const revertStrategicRegionEdit = useMapDataStore((s) => s.revertStrategicRegionEdit)

  const newEntries: EntityChangeEntry[] = [...pendingNewStrategicRegions.entries()].map(([regionId, region]) => ({
    id: regionId,
    name: pendingStrategicRegionEdits.get(regionId)?.name ?? region.displayName,
    fieldCount: 0,
    kind: 'new'
  }))

  const editEntries: EntityChangeEntry[] = [...pendingStrategicRegionEdits.entries()]
    .filter(([regionId]) => !pendingNewStrategicRegions.has(regionId))
    .map(([regionId, patch]) => {
      const region = strategicRegionsById.get(regionId)
      return {
        id: regionId,
        name: patch.name ?? region?.displayName ?? String(regionId),
        fieldCount: Object.keys(patch).length,
        kind: 'edit'
      }
    })

  const deleteEntries: EntityChangeEntry[] = [...pendingStrategicRegionDeletions].map((regionId) => ({
    id: regionId,
    name: strategicRegionsById.get(regionId)?.displayName ?? String(regionId),
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
      title={t('stratRegionPanel.changes.title')}
      entries={entries}
      emptyText={t('stratRegionPanel.changes.empty')}
      fieldCountLabel={(count) => t('stratRegionPanel.changes.fieldCount', { count })}
      kindLabel={(kind) => kindLabels[kind]}
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
