import { Text } from '@fluentui/react-components'
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { EntityList } from '../entityPanel/EntityList'
import { useEntityRowStyles } from '../entityPanel/entityRowStyles'
import type { StrategicRegionDefinition } from '../../../../../shared/mapDataTypes'

export function StrategicRegionList(): JSX.Element {
  const rowStyles = useEntityRowStyles()
  const { t } = useI18n()

  const strategicRegions = useMapDataStore((s) => s.strategicRegions)
  const selectedStrategicRegionId = useMapDataStore((s) => s.selectedStrategicRegionId)
  const setSelectedStrategicRegionId = useMapDataStore((s) => s.setSelectedStrategicRegionId)
  const pendingStrategicRegionEdits = useMapDataStore((s) => s.pendingStrategicRegionEdits)

  return (
    <EntityList<StrategicRegionDefinition>
      items={strategicRegions}
      getId={(region) => region.id}
      isSelected={(region) => region.id === selectedStrategicRegionId}
      isEdited={(region) => pendingStrategicRegionEdits.has(region.id)}
      onSelect={(region) => setSelectedStrategicRegionId(
        region.id === selectedStrategicRegionId ? null : region.id
      )}
      searchPredicate={(region, q) => region.id.toString().includes(q) || region.name.toLowerCase().includes(q)}
      searchPlaceholder={t('stratRegionPanel.list.searchPlaceholder')}
      emptyText={t('stratRegionPanel.list.empty')}
      renderRow={(region) => {
        const patch = pendingStrategicRegionEdits.get(region.id)
        // A pending edit to the raw key takes precedence (it's what will be
        // saved); otherwise show the resolved localised text.
        const nameLabel = patch?.name ?? region.displayName

        return (
          <>
            <Text size={100} className={rowStyles.id}>{region.id}</Text>
            <Text size={100} className={rowStyles.name}>{nameLabel || `Region ${region.id}`}</Text>
            <Text size={100} className={rowStyles.count}>{region.provinceIds.length}</Text>
          </>
        )
      }}
    />
  )
}
