import { useState } from 'react'
import { useCoreStore } from '../../../infra/store/coreStore'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { applyStrategicRegionPatch } from '../../../infra/store/slices/strategicRegionEditSlice'
import { useI18n } from '../../i18n/I18nProvider'
import { EntitySaveBar } from '../entityPanel/EntitySaveBar'

export function StrategicRegionSaveBar(): JSX.Element {
  const { t } = useI18n()
  const projectId = useCoreStore((s) => s.projectId)

  const pendingStrategicRegionEdits = useMapDataStore((s) => s.pendingStrategicRegionEdits)
  const strategicRegionsById = useMapDataStore((s) => s.strategicRegionsById)
  const strategicRegionEditBaselines = useMapDataStore((s) => s.strategicRegionEditBaselines)
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
      const requests = [...pendingStrategicRegionEdits.entries()].map(([id, patch]) => {
        const original = strategicRegionEditBaselines.get(id) ?? strategicRegionsById.get(id)
        if (!original) throw new Error(`Region ${id} not found`)
        return { original, updated: applyStrategicRegionPatch(original, patch) }
      })
      await window.api.map.saveStrategicRegions(projectId, requests)
      clearStrategicRegionSavedChanges()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('stratRegionPanel.save.error'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <EntitySaveBar
      summary={t('stratRegionPanel.save.summary', { count: changeCount })}
      actionLabel={t('stratRegionPanel.save.action')}
      savingLabel={t('stratRegionPanel.save.saving')}
      disabled={!projectId || !hasPendingChanges || isSaving}
      saving={isSaving}
      error={saveError}
      onSave={() => void handleSave()}
    />
  )
}
