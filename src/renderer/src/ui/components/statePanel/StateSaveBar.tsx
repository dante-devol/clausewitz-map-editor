import { useState } from 'react'
import { useCoreStore } from '../../../infra/store/coreStore'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { applyStatePatch } from '../../../infra/store/slices/stateEditSlice'
import { useI18n } from '../../i18n/I18nProvider'
import { EntitySaveBar } from '../entityPanel/EntitySaveBar'

export function StateSaveBar(): JSX.Element {
  const { t } = useI18n()
  const projectId = useCoreStore((s) => s.projectId)

  const pendingStateEdits = useMapDataStore((s) => s.pendingStateEdits)
  const statesById = useMapDataStore((s) => s.statesById)
  const stateEditBaselines = useMapDataStore((s) => s.stateEditBaselines)
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
      // Send each state as it was when editing began plus the desired result;
      // the main process writes only the edited fields and reports conflicts.
      const requests = [...pendingStateEdits.entries()].map(([id, patch]) => {
        const original = stateEditBaselines.get(id) ?? statesById.get(id)
        if (!original) throw new Error(`State ${id} not found`)
        return { original, updated: applyStatePatch(original, patch) }
      })
      await window.api.map.saveStates(projectId, requests)
      clearStateSavedChanges()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('statePanel.save.error'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <EntitySaveBar
      summary={t('statePanel.save.summary', { count: changeCount })}
      actionLabel={t('statePanel.save.action')}
      savingLabel={t('statePanel.save.saving')}
      disabled={!projectId || !hasPendingChanges || isSaving}
      saving={isSaving}
      error={saveError}
      onSave={() => void handleSave()}
    />
  )
}
