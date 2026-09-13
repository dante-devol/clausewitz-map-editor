import { useState } from 'react'
import { useCoreStore } from '../../../infra/store/coreStore'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { applyStrategicRegionPatch } from '../../../infra/store/slices/strategicRegionEditSlice'
import { useI18n } from '../../i18n/I18nProvider'
import { EntitySaveBar } from '../entityPanel/EntitySaveBar'
import type { StrategicRegionSaveOperation } from '../../../../../shared/contract/api'

export function StrategicRegionSaveBar(): JSX.Element {
  const { t } = useI18n()
  const projectId = useCoreStore((s) => s.projectId)

  const pendingStrategicRegionEdits = useMapDataStore((s) => s.pendingStrategicRegionEdits)
  const pendingNewStrategicRegions = useMapDataStore((s) => s.pendingNewStrategicRegions)
  const pendingStrategicRegionDeletions = useMapDataStore((s) => s.pendingStrategicRegionDeletions)
  const strategicRegionsById = useMapDataStore((s) => s.strategicRegionsById)
  const strategicRegionEditBaselines = useMapDataStore((s) => s.strategicRegionEditBaselines)
  const clearStrategicRegionSavedChanges = useMapDataStore((s) => s.clearStrategicRegionSavedChanges)

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const changeCount = pendingNewStrategicRegions.size + pendingStrategicRegionDeletions.size +
    [...pendingStrategicRegionEdits.keys()].filter((id) => !pendingNewStrategicRegions.has(id)).length
  const hasPendingChanges = changeCount > 0

  const handleSave = async () => {
    if (!projectId || !hasPendingChanges || isSaving) return

    setIsSaving(true)
    setSaveError(null)
    try {
      const creates: StrategicRegionSaveOperation[] = [...pendingNewStrategicRegions.entries()].map(([id, region]) => {
        const patch = pendingStrategicRegionEdits.get(id)
        return { kind: 'create', region: patch ? applyStrategicRegionPatch(region, patch) : region }
      })
      const edits: StrategicRegionSaveOperation[] = [...pendingStrategicRegionEdits.entries()]
        .filter(([id]) => !pendingNewStrategicRegions.has(id))
        .map(([id, patch]) => {
          const original = strategicRegionEditBaselines.get(id) ?? strategicRegionsById.get(id)
          if (!original) throw new Error(`Region ${id} not found`)
          return { kind: 'edit', original, updated: applyStrategicRegionPatch(original, patch) }
        })
      const deletions: StrategicRegionSaveOperation[] = [...pendingStrategicRegionDeletions].map((id) => {
        const original = strategicRegionsById.get(id)
        if (!original) throw new Error(`Region ${id} not found`)
        return { kind: 'delete', original }
      })
      await window.api.map.saveStrategicRegions(projectId, [...creates, ...edits, ...deletions])
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
