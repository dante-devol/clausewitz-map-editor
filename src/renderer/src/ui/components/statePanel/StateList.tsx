import { useMemo } from 'react'
import { Button, Text, makeStyles, tokens } from '@fluentui/react-components'
import { AddRegular } from '@fluentui/react-icons'
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { EntityList } from '../entityPanel/EntityList'
import { EntitySearchBar } from '../entityPanel/EntitySearchBar'
import { useEntitySearch, type EntitySearchConfig } from '../entityPanel/entitySearch'
import { useEntityRowStyles } from '../entityPanel/entityRowStyles'
import type { StateDefinition } from '../../../../../shared/mapDataTypes'

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

export function StateList(): JSX.Element {
  const rowStyles = useEntityRowStyles()
  const styles = useStyles()
  const { t } = useI18n()

  const states = useMapDataStore((s) => s.states)
  const pendingNewStates = useMapDataStore((s) => s.pendingNewStates)
  const pendingStateDeletions = useMapDataStore((s) => s.pendingStateDeletions)
  const selectedStateId = useMapDataStore((s) => s.selectedStateId)
  const setSelectedStateId = useMapDataStore((s) => s.setSelectedStateId)
  const pendingStateEdits = useMapDataStore((s) => s.pendingStateEdits)
  const createState = useMapDataStore((s) => s.createState)

  const displayedStates = useMemo(
    () => [...states, ...pendingNewStates.values()].sort((a, b) => a.id - b.id),
    [states, pendingNewStates]
  )

  const handleCreate = () => setSelectedStateId(createState())

  const searchConfig = useMemo<EntitySearchConfig<StateDefinition>>(() => ({
    freeTextValues: (state) => [
      String(state.id),
      state.name.toLowerCase(),
      state.displayName.toLowerCase(),
      state.stateCategory.toLowerCase(),
      ...(state.history.owner ? [state.history.owner.toLowerCase()] : [])
    ],
    fields: [
      {
        key: 'category',
        label: t('entitySearch.field.category'),
        getValues: (state) => [state.stateCategory.toLowerCase()]
      },
      {
        key: 'owner',
        label: t('entitySearch.field.owner'),
        getValues: (state) => (state.history.owner ? [state.history.owner.toLowerCase()] : [])
      }
    ]
  }), [t])

  const search = useEntitySearch(displayedStates, searchConfig)

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
            placeholder={t('statePanel.list.searchPlaceholder')}
            removeChipLabel={t('entitySearch.removeFilter')}
          />
        </div>
        <Button size="small" icon={<AddRegular />} onClick={handleCreate}>
          {t('statePanel.list.create')}
        </Button>
      </div>
      <EntityList<StateDefinition>
        items={search.filteredItems}
        getId={(state) => state.id}
        isSelected={(state) => state.id === selectedStateId}
        isEdited={(state) => pendingStateEdits.has(state.id) || pendingStateDeletions.has(state.id) || pendingNewStates.has(state.id)}
        onSelect={(state) => setSelectedStateId(state.id === selectedStateId ? null : state.id)}
        emptyText={t('statePanel.list.empty')}
        renderRow={(state) => {
          const patch = pendingStateEdits.get(state.id)
          // A pending edit to the raw key takes precedence (it's what will be
          // saved); otherwise show the resolved localised text.
          const nameLabel = patch?.name ?? state.displayName
          const displayOwner = patch !== undefined && 'owner' in patch
            ? (patch.owner ?? undefined)
            : state.history.owner
          const displayCategory = patch?.stateCategory ?? state.stateCategory

          return (
            <>
              <Text size={100} className={rowStyles.id}>{state.id}</Text>
              <Text size={100} className={rowStyles.name}>{nameLabel}</Text>
              <Text size={100} className={rowStyles.category}>{displayCategory}</Text>
              <Text size={100} className={rowStyles.owner}>{displayOwner ?? '—'}</Text>
            </>
          )
        }}
      />
    </>
  )
}
