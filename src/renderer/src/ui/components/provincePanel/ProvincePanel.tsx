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
import { useCoreStore } from '../../../infra/store/coreStore'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import {
  selectEffectiveProvincesForSave,
  selectIncompleteProvinceDraftTargets
} from '../../../infra/store/provinceEditSelectors'
import { CanonicalProvinceList } from './CanonicalProvinceList'
import { BmpOnlyList } from './BmpOnlyList'
import { ChangesList } from './ChangesList'
import { useI18n } from '../../i18n/I18nProvider'

const useStyles = makeStyles({
  saveBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0
  },
  saveBarText: {
    color: tokens.colorNeutralForeground3
  },
  saveBarActions: {
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
  const projectId = useCoreStore((s) => s.projectId)

  const continents = useMapDataStore((s) => s.continents)
  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)
  const pendingEdits = useMapDataStore((s) => s.pendingEdits)
  const pendingBmpOnlyEdits = useMapDataStore((s) => s.pendingBmpOnlyEdits)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const pendingNewProvinces = useMapDataStore((s) => s.pendingNewProvinces)
  const loadOriginalDefinitions = useMapDataStore((s) => s.loadOriginalDefinitions)
  const clearSavedChanges = useMapDataStore((s) => s.clearSavedChanges)

  const [canonicalCollapsed, setCanonicalCollapsed] = useState(false)
  const [bmpCollapsed, setBmpCollapsed] = useState(false)
  const [changesCollapsed, setChangesCollapsed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showSaveBlocker, setShowSaveBlocker] = useState(false)

  const changeCount = pendingEdits.size + pendingBmpOnlyEdits.size + bmpReplacements.size + pendingNewProvinces.size

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
  const hasPendingChanges = changeCount > 0

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

  return (
    <div className={styles.panel}>
      <CanonicalProvinceList
        collapsed={canonicalCollapsed}
        onToggleCollapse={() => setCanonicalCollapsed((c) => !c)}
      />
      <BmpOnlyList
        collapsed={bmpCollapsed}
        onToggleCollapse={() => setBmpCollapsed((c) => !c)}
      />
      <ChangesList
        collapsed={changesCollapsed}
        onToggleCollapse={() => setChangesCollapsed((c) => !c)}
      />
      <div className={styles.saveBar}>
        <Text size={100} className={styles.saveBarText}>
          {t('provincePanel.save.summary', { count: changeCount })}
        </Text>
        <div className={styles.saveBarActions}>
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
