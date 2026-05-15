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
import { applyStrategicRegionPatch } from '../../../infra/store/slices/strategicRegionEditSlice'
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

export function StrategicRegionSaveBar(): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const projectId = useCoreStore((s) => s.projectId)

  const pendingStrategicRegionEdits = useMapDataStore((s) => s.pendingStrategicRegionEdits)
  const strategicRegionsById = useMapDataStore((s) => s.strategicRegionsById)
  const clearStrategicRegionSavedChanges = useMapDataStore((s) => s.clearStrategicRegionSavedChanges)

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const changeCount = pendingStrategicRegionEdits.size
  const hasPendingChanges = changeCount > 0

  const handleSave = async () => {
    if (!projectId || !hasPendingChanges || isSaving) return

    setIsSaving(true)
    setSaveError(null)
    try {
      const regionsToSave = [...pendingStrategicRegionEdits.entries()].map(([id, patch]) => {
        const original = strategicRegionsById.get(id)
        if (!original) throw new Error(`Region ${id} not found`)
        return applyStrategicRegionPatch(original, patch)
      })
      await window.api.map.saveStrategicRegions(projectId, regionsToSave)
      clearStrategicRegionSavedChanges()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('stratRegionPanel.save.error'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <Text size={100} className={styles.summaryText}>
        {t('stratRegionPanel.save.summary', { count: changeCount })}
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
          {isSaving ? t('stratRegionPanel.save.saving') : t('stratRegionPanel.save.action')}
        </Button>
      </div>
    </div>
  )
}
