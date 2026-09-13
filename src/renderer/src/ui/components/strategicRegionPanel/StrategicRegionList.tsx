import { useMemo } from 'react'
import { Button, Text, makeStyles, tokens } from '@fluentui/react-components'
import { AddRegular } from '@fluentui/react-icons'
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { EntityList } from '../entityPanel/EntityList'
import { EntitySearchBar } from '../entityPanel/EntitySearchBar'
import { useEntitySearch, type EntitySearchConfig } from '../entityPanel/entitySearch'
import { useEntityRowStyles } from '../entityPanel/entityRowStyles'
import type { StrategicRegionDefinition } from '../../../../../shared/mapDataTypes'

const useStyles = makeStyles({
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`
  },
  search: {
    flex: 1,
    minWidth: 0
  }
})

export function StrategicRegionList(): JSX.Element {
  const rowStyles = useEntityRowStyles()
  const styles = useStyles()
  const { t } = useI18n()

  const strategicRegions = useMapDataStore((s) => s.strategicRegions)
  const pendingNewStrategicRegions = useMapDataStore((s) => s.pendingNewStrategicRegions)
  const pendingStrategicRegionDeletions = useMapDataStore((s) => s.pendingStrategicRegionDeletions)
  const selectedStrategicRegionId = useMapDataStore((s) => s.selectedStrategicRegionId)
  const setSelectedStrategicRegionId = useMapDataStore((s) => s.setSelectedStrategicRegionId)
  const pendingStrategicRegionEdits = useMapDataStore((s) => s.pendingStrategicRegionEdits)
  const createStrategicRegion = useMapDataStore((s) => s.createStrategicRegion)

  const displayedRegions = useMemo(
    () => [...strategicRegions, ...pendingNewStrategicRegions.values()].sort((a, b) => a.id - b.id),
    [strategicRegions, pendingNewStrategicRegions]
  )

  const handleCreate = () => setSelectedStrategicRegionId(createStrategicRegion())

  const searchConfig = useMemo<EntitySearchConfig<StrategicRegionDefinition>>(() => ({
    freeTextValues: (region) => [String(region.id), region.name.toLowerCase(), region.displayName.toLowerCase()],
    fields: []
  }), [])

  const search = useEntitySearch(displayedRegions, searchConfig)

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.search}>
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
        </div>
        <Button size="small" icon={<AddRegular />} onClick={handleCreate}>
          {t('stratRegionPanel.list.create')}
        </Button>
      </div>
      <EntityList<StrategicRegionDefinition>
        items={search.filteredItems}
        getId={(region) => region.id}
        isSelected={(region) => region.id === selectedStrategicRegionId}
        isEdited={(region) =>
          pendingStrategicRegionEdits.has(region.id) ||
          pendingStrategicRegionDeletions.has(region.id) ||
          pendingNewStrategicRegions.has(region.id)
        }
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
