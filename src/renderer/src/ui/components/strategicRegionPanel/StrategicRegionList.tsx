import { useMemo } from 'react'
import { Text } from '@fluentui/react-components'
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { EntityList } from '../entityPanel/EntityList'
import { EntitySearchBar } from '../entityPanel/EntitySearchBar'
import { useEntitySearch, type EntitySearchConfig } from '../entityPanel/entitySearch'
import { useEntityRowStyles } from '../entityPanel/entityRowStyles'
import type { StrategicRegionDefinition } from '../../../../../shared/mapDataTypes'

export function StrategicRegionList(): JSX.Element {
  const rowStyles = useEntityRowStyles()
  const { t } = useI18n()

  const strategicRegions = useMapDataStore((s) => s.strategicRegions)
  const selectedStrategicRegionId = useMapDataStore((s) => s.selectedStrategicRegionId)
  const setSelectedStrategicRegionId = useMapDataStore((s) => s.setSelectedStrategicRegionId)
  const pendingStrategicRegionEdits = useMapDataStore((s) => s.pendingStrategicRegionEdits)

  const searchConfig = useMemo<EntitySearchConfig<StrategicRegionDefinition>>(() => ({
    freeTextValues: (region) => [String(region.id), region.name.toLowerCase(), region.displayName.toLowerCase()],
    fields: []
  }), [])

  const search = useEntitySearch(strategicRegions, searchConfig)

  return (
    <>
      <EntitySearchBar
        query={search.query}
        onQueryChange={search.setQuery}
        chips={search.chips}
        onRemoveChip={search.removeChip}
        suggestions={search.suggestions}
        onApplySuggestion={search.addChip}
        placeholder={t('stratRegionPanel.list.searchPlaceholder')}
        removeChipLabel={t('entitySearch.removeFilter')}
      />
      <EntityList<StrategicRegionDefinition>
        items={search.filteredItems}
        getId={(region) => region.id}
        isSelected={(region) => region.id === selectedStrategicRegionId}
        isEdited={(region) => pendingStrategicRegionEdits.has(region.id)}
        onSelect={(region) => setSelectedStrategicRegionId(
          region.id === selectedStrategicRegionId ? null : region.id
        )}
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
    </>
  )
}
