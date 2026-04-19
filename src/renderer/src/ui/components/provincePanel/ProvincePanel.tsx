import { useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  tokens,
  Text
} from '@fluentui/react-components'
import { SaveRegular } from '@fluentui/react-icons'
import { useCoreSelector } from '../../../bridge/useCoreSelector'
import { selectCurrentProjectId } from '../../../core/selectors/sessionSelectors'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import {
  selectEffectiveProvincesForSave,
  selectIncompleteProvinceDraftTargets
} from '../../../infra/store/provinceEditSelectors'
import { CanonicalProvinceList } from './CanonicalProvinceList'
import { BmpOnlyList } from './BmpOnlyList'
import { ChangesList } from './ChangesList'
import { useCrossSelection } from './useCrossSelection'
import type { BmpAssignment } from '../../../../../shared/provinceEditing'
import { useI18n } from '../../i18n/I18nProvider'

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`
  },
  headerText: {
    color: tokens.colorNeutralForeground3
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'hidden'
  }
})

export function ProvincePanel(): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const projectId = useCoreSelector(selectCurrentProjectId)

  const provinceCatalog = useMapDataStore((s) => s.provinceCatalog)
  const continents = useMapDataStore((s) => s.continents)
  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)
  const pendingEdits = useMapDataStore((s) => s.pendingEdits)
  const pendingBmpOnlyEdits = useMapDataStore((s) => s.pendingBmpOnlyEdits)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const pendingNewProvinces = useMapDataStore((s) => s.pendingNewProvinces)
  const loadOriginalDefinitions = useMapDataStore((s) => s.loadOriginalDefinitions)
  const clearSavedChanges = useMapDataStore((s) => s.clearSavedChanges)
  const revertEdit = useMapDataStore((s) => s.revertEdit)
  const revertBmpOnlyEdit = useMapDataStore((s) => s.revertBmpOnlyEdit)
  const revertBmpReplacement = useMapDataStore((s) => s.revertBmpReplacement)
  const revertNewProvince = useMapDataStore((s) => s.revertNewProvince)
  const clearAllSelection = useMapDataStore((s) => s.clearAllSelection)

  const { changes, crossSelectedProvinceIds, crossSelectedBmpGuids, crossSelectedChangeId } = useCrossSelection()

  const [canonicalCollapsed, setCanonicalCollapsed] = useState(false)
  const [bmpCollapsed, setBmpCollapsed] = useState(false)
  const [changesCollapsed, setChangesCollapsed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showSaveBlocker, setShowSaveBlocker] = useState(false)

  // Derive a guid-keyed assignment map for BmpOnlyList display
  const bmpAssignments = useMemo(() => {
    const map = new Map<string, BmpAssignment>()
    for (const [provinceId, guid] of bmpReplacements) {
      map.set(guid, { kind: 'replace', targetId: provinceId })
    }
    for (const [guid, assignedId] of pendingNewProvinces) {
      map.set(guid, { kind: 'register', assignedId })
    }
    return map
  }, [bmpReplacements, pendingNewProvinces])

  const normalizedProvinces = useMemo(
    () => selectEffectiveProvincesForSave(
      originalDefinitions,
      pendingEdits,
      pendingBmpOnlyEdits,
      bmpReplacements,
      pendingNewProvinces,
      bmpOnlyEntries,
      true
    ),
    [originalDefinitions, pendingEdits, pendingBmpOnlyEdits, bmpReplacements, pendingNewProvinces, bmpOnlyEntries]
  )
  const incompleteTargets = useMemo(
    () => selectIncompleteProvinceDraftTargets(
      originalDefinitions,
      pendingEdits,
      pendingBmpOnlyEdits,
      bmpReplacements,
      pendingNewProvinces,
      bmpOnlyEntries
    ),
    [originalDefinitions, pendingEdits, pendingBmpOnlyEdits, bmpReplacements, pendingNewProvinces, bmpOnlyEntries]
  )

  const continentList = useMemo(() => [...continents.values()], [continents])
  const hasPendingChanges = changes.length > 0

  const persistSave = async (provincesToSave: typeof normalizedProvinces) => {
    if (!projectId || !hasPendingChanges || isSaving) return

    setIsSaving(true)
    setSaveError(null)
    try {
      await window.api.map.save(projectId, provincesToSave, continentList)
      loadOriginalDefinitions(provincesToSave)
      clearSavedChanges()
      setShowSaveBlocker(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('provincePanel.save.error'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    if (!projectId || !hasPendingChanges || isSaving) return
    if (incompleteTargets.length > 0) {
      setShowSaveBlocker(true)
      return
    }
    await persistSave(selectEffectiveProvincesForSave(
      originalDefinitions,
      pendingEdits,
      pendingBmpOnlyEdits,
      bmpReplacements,
      pendingNewProvinces,
      bmpOnlyEntries,
      false
    ))
  }

  const handleRevert = (id: string) => {
    if (id.startsWith('field-edit:')) {
      revertEdit(parseInt(id.slice('field-edit:'.length), 10))
    } else if (id.startsWith('bmp-field-edit:')) {
      revertBmpOnlyEdit(id.slice('bmp-field-edit:'.length))
    } else if (id.startsWith('bmp-replacement:')) {
      revertBmpReplacement(parseInt(id.slice('bmp-replacement:'.length), 10))
    } else if (id.startsWith('new-province:')) {
      revertNewProvince(id.slice('new-province:'.length))
    }
    clearAllSelection()
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Text size={100} className={styles.headerText}>
          {t('provincePanel.save.summary', { count: changes.length })}
        </Text>
        <div className={styles.headerActions}>
          {saveError && (
            <Text size={100} className={styles.errorText}>
              {saveError}
            </Text>
          )}
          <Button
            size="small"
            appearance="primary"
            icon={<SaveRegular />}
            disabled={!projectId || !hasPendingChanges || isSaving}
            onClick={handleSave}
          >
            {isSaving ? t('provincePanel.save.saving') : t('provincePanel.save.action')}
          </Button>
        </div>
      </div>
      <CanonicalProvinceList
        collapsed={canonicalCollapsed}
        onToggleCollapse={() => setCanonicalCollapsed((c) => !c)}
        provinceCatalog={provinceCatalog}
        crossSelectedIds={crossSelectedProvinceIds}
      />
      <BmpOnlyList
        collapsed={bmpCollapsed}
        onToggleCollapse={() => setBmpCollapsed((c) => !c)}
        entries={bmpOnlyEntries}
        bmpAssignments={bmpAssignments}
        crossSelectedGuids={crossSelectedBmpGuids}
      />
      <ChangesList
        collapsed={changesCollapsed}
        onToggleCollapse={() => setChangesCollapsed((c) => !c)}
        changes={changes}
        crossSelectedChangeId={crossSelectedChangeId}
        onRevert={handleRevert}
      />
      <Dialog open={showSaveBlocker}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('provincePanel.save.blocker.title')}</DialogTitle>
            <DialogContent>
              <Text>{t('provincePanel.save.blocker.body', { count: incompleteTargets.length })}</Text>
              <Text>
                {t('provincePanel.save.blocker.ids', {
                  ids: incompleteTargets.map((target) => target.provinceId).join(', ')
                })}
              </Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setShowSaveBlocker(false)}>
                {t('provincePanel.save.blocker.cancel')}
              </Button>
              <Button appearance="primary" onClick={() => void persistSave(normalizedProvinces)}>
                {t('provincePanel.save.blocker.confirm')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
