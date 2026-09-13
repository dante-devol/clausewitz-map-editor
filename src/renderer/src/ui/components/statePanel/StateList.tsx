import { useMemo } from 'react'
import { Text } from '@fluentui/react-components'
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { EntityList } from '../entityPanel/EntityList'
import { EntitySearchBar } from '../entityPanel/EntitySearchBar'
import { useEntitySearch, type EntitySearchConfig } from '../entityPanel/entitySearch'
import { useEntityRowStyles } from '../entityPanel/entityRowStyles'
import type { StateDefinition } from '../../../../../shared/mapDataTypes'

export function StateList(): JSX.Element {
  const rowStyles = useEntityRowStyles()
  const { t } = useI18n()

  const states = useMapDataStore((s) => s.states)
  const selectedStateId = useMapDataStore((s) => s.selectedStateId)
  const setSelectedStateId = useMapDataStore((s) => s.setSelectedStateId)
  const pendingStateEdits = useMapDataStore((s) => s.pendingStateEdits)

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

  const search = useEntitySearch(states, searchConfig)

  return (
    <>
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
      <EntityList<StateDefinition>
        items={search.filteredItems}
        getId={(state) => state.id}
        isSelected={(state) => state.id === selectedStateId}
        isEdited={(state) => pendingStateEdits.has(state.id)}
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
