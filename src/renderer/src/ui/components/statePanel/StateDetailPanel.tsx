import {
  Button,
  Input,
  Select,
  makeStyles,
  tokens,
  Text
} from '@fluentui/react-components'
import { DismissRegular } from '@fluentui/react-icons'
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import type { StateEditPatch } from '../../../infra/store/slices/stateEditSlice'

const useStyles = makeStyles({
  root: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    maxHeight: '260px',
    overflowY: 'auto'
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    padding: `${tokens.spacingVerticalS} 0`
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS
  },
  titleText: {
    fontWeight: tokens.fontWeightSemibold
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
    alignItems: 'center'
  },
  label: {
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap'
  },
  original: {
    color: tokens.colorNeutralForeground4,
    fontStyle: 'italic'
  },
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  }
})

export function StateDetailPanel(): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()

  const selectedStateId = useMapDataStore((s) => s.selectedStateId)
  const statesById = useMapDataStore((s) => s.statesById)
  const stateCategories = useMapDataStore((s) => s.stateCategories)
  const pendingStateEdits = useMapDataStore((s) => s.pendingStateEdits)
  const editState = useMapDataStore((s) => s.editState)
  const revertStateEdit = useMapDataStore((s) => s.revertStateEdit)

  const state = selectedStateId !== null ? statesById.get(selectedStateId) : undefined
  const patch = selectedStateId !== null ? (pendingStateEdits.get(selectedStateId) ?? {}) : {}
  const hasPatch = selectedStateId !== null && pendingStateEdits.has(selectedStateId)

  if (!state) {
    return (
      <div className={styles.root}>
        <Text size={200} className={styles.empty}>{t('statePanel.detail.noSelection')}</Text>
      </div>
    )
  }

  const dispatch = (p: StateEditPatch) => editState(state.id, p)

  const displayName = patch.name ?? state.name
  const displayCategory = patch.stateCategory ?? state.stateCategory
  const displayManpower = patch.manpower ?? state.manpower
  const displayOwner = 'owner' in patch ? (patch.owner ?? '') : (state.history.owner ?? '')

  const categoryList = [...stateCategories.keys()].sort()

  return (
    <div className={styles.root}>
      <div className={styles.titleRow}>
        <Text size={200} className={styles.titleText}>
          {t('statePanel.detail.title', { id: state.id })}
        </Text>
        {hasPatch && (
          <Button
            size="small"
            appearance="subtle"
            icon={<DismissRegular />}
            onClick={() => revertStateEdit(state.id)}
          />
        )}
      </div>
      <div className={styles.grid}>
        <Text size={100} className={styles.label}>{t('statePanel.detail.name')}</Text>
        <div className={styles.inputWrapper}>
          <Input
            size="small"
            value={displayName}
            onChange={(_, d) => dispatch({ name: d.value })}
          />
          {patch.name !== undefined && (
            <Text size={100} className={styles.original}>
              {t('provinceEdit.original', { value: state.name })}
            </Text>
          )}
        </div>

        <Text size={100} className={styles.label}>{t('statePanel.detail.category')}</Text>
        <div className={styles.inputWrapper}>
          <Select
            size="small"
            value={displayCategory}
            onChange={(_, d) => dispatch({ stateCategory: d.value })}
          >
            {categoryList.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Select>
          {patch.stateCategory !== undefined && (
            <Text size={100} className={styles.original}>
              {t('provinceEdit.original', { value: state.stateCategory })}
            </Text>
          )}
        </div>

        <Text size={100} className={styles.label}>{t('statePanel.detail.manpower')}</Text>
        <div className={styles.inputWrapper}>
          <Input
            size="small"
            type="number"
            value={String(displayManpower)}
            onChange={(_, d) => {
              const n = parseInt(d.value, 10)
              if (!isNaN(n)) dispatch({ manpower: n })
            }}
          />
          {patch.manpower !== undefined && (
            <Text size={100} className={styles.original}>
              {t('provinceEdit.original', { value: state.manpower })}
            </Text>
          )}
        </div>

        <Text size={100} className={styles.label}>{t('statePanel.detail.owner')}</Text>
        <div className={styles.inputWrapper}>
          <Input
            size="small"
            value={displayOwner}
            maxLength={3}
            onChange={(_, d) => dispatch({ owner: d.value.toUpperCase() || null })}
          />
          {('owner' in patch) && (
            <Text size={100} className={styles.original}>
              {t('provinceEdit.original', { value: state.history.owner ?? '—' })}
            </Text>
          )}
        </div>
      </div>
    </div>
  )
}
