import { useState } from 'react'
import {
  Button,
  makeStyles,
  tokens,
  Text
} from '@fluentui/react-components'
import { SaveRegular } from '@fluentui/react-icons'
import { useCoreStore } from '../../../infra/store/coreStore'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { useI18n } from '../../i18n/I18nProvider'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0
  },
  summaryText: {
    color: tokens.colorNeutralForeground3
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1
  }
})

export function StateSaveBar(): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const projectId = useCoreStore((s) => s.projectId)

  const pendingStateEdits = useMapDataStore((s) => s.pendingStateEdits)
  const statesById = useMapDataStore((s) => s.statesById)
  const clearStateSavedChanges = useMapDataStore((s) => s.clearStateSavedChanges)

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const changeCount = pendingStateEdits.size
  const hasPendingChanges = changeCount > 0

  const handleSave = async () => {
    if (!projectId || !hasPendingChanges || isSaving) return

    setIsSaving(true)
    setSaveError(null)
    try {
      const statesToSave = [...pendingStateEdits.entries()].map(([id, patch]) => {
        const original = statesById.get(id)
        if (!original) throw new Error(`State ${id} not found`)
        return {
          ...original,
          name: patch.name ?? original.name,
          stateCategory: patch.stateCategory ?? original.stateCategory,
          manpower: patch.manpower ?? original.manpower,
          history: {
            ...original.history,
            owner: 'owner' in patch ? (patch.owner ?? undefined) : original.history.owner,
          }
        }
      })
      await window.api.map.saveStates(projectId, statesToSave)
      clearStateSavedChanges()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('statePanel.save.error'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <Text size={100} className={styles.summaryText}>
        {t('statePanel.save.summary', { count: changeCount })}
      </Text>
      <div className={styles.actions}>
        {saveError && (
          <Text size={100} className={styles.errorText}>{saveError}</Text>
        )}
        <Button
          size="small"
          appearance="primary"
          icon={<SaveRegular />}
          disabled={!projectId || !hasPendingChanges || isSaving}
          onClick={handleSave}
        >
          {isSaving ? t('statePanel.save.saving') : t('statePanel.save.action')}
        </Button>
      </div>
    </div>
  )
}
