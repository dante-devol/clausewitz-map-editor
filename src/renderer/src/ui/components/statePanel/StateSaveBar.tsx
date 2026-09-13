import { useState } from 'react'
import { useCoreStore } from '../../../infra/store/coreStore'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { applyStatePatch } from '../../../infra/store/slices/stateEditSlice'
import { useI18n } from '../../i18n/I18nProvider'
import { EntitySaveBar } from '../entityPanel/EntitySaveBar'
import type { StateSaveOperation } from '../../../../../shared/contract/api'

export function StateSaveBar(): JSX.Element {
  const { t } = useI18n()
  const projectId = useCoreStore((s) => s.projectId)

  const pendingStateEdits = useMapDataStore((s) => s.pendingStateEdits)
  const pendingNewStates = useMapDataStore((s) => s.pendingNewStates)
  const pendingStateDeletions = useMapDataStore((s) => s.pendingStateDeletions)
  const statesById = useMapDataStore((s) => s.statesById)
  const stateEditBaselines = useMapDataStore((s) => s.stateEditBaselines)
  const clearStateSavedChanges = useMapDataStore((s) => s.clearStateSavedChanges)

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const changeCount = pendingNewStates.size + pendingStateDeletions.size +
    [...pendingStateEdits.keys()].filter((id) => !pendingNewStates.has(id)).length
  const hasPendingChanges = changeCount > 0

  const handleSave = async () => {
    if (!projectId || !hasPendingChanges || isSaving) return

    setIsSaving(true)
    setSaveError(null)
    try {
      const creates: StateSaveOperation[] = [...pendingNewStates.entries()].map(([id, state]) => {
        const patch = pendingStateEdits.get(id)
        return { kind: 'create', state: patch ? applyStatePatch(state, patch) : state }
      })
      // Send each edited state as it was when editing began plus the desired
      // result; the main process writes only the edited fields and reports
      // conflicts. Pending-new states are handled above as creates instead.
      const edits: StateSaveOperation[] = [...pendingStateEdits.entries()]
        .filter(([id]) => !pendingNewStates.has(id))
        .map(([id, patch]) => {
          const original = stateEditBaselines.get(id) ?? statesById.get(id)
          if (!original) throw new Error(`State ${id} not found`)
          return { kind: 'edit', original, updated: applyStatePatch(original, patch) }
        })
      const deletions: StateSaveOperation[] = [...pendingStateDeletions].map((id) => {
        const original = statesById.get(id)
        if (!original) throw new Error(`State ${id} not found`)
        return { kind: 'delete', original }
      })
      await window.api.map.saveStates(projectId, [...creates, ...edits, ...deletions])
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
