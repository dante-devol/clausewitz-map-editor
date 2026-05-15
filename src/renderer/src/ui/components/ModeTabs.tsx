import { Tab, TabList, makeStyles, tokens } from '@fluentui/react-components'
import type { SelectTabData } from '@fluentui/react-components'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import type { EditorMode } from '../../infra/store/slices/editorModeSlice'
import { useI18n } from '../i18n/I18nProvider'

const useStyles = makeStyles({
  root: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    flexShrink: 0
  }
})

export function ModeTabs(): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const editorMode = useMapDataStore((s) => s.editorMode)
  const setEditorMode = useMapDataStore((s) => s.setEditorMode)

  const handleTabSelect = (_: unknown, data: SelectTabData) => {
    setEditorMode(data.value as EditorMode)
  }

  return (
    <div className={styles.root}>
      <TabList selectedValue={editorMode} onTabSelect={handleTabSelect} size="small">
        <Tab value="provinces">{t('mode.provinces')}</Tab>
        <Tab value="states">{t('mode.states')}</Tab>
        <Tab value="strategicRegions">{t('mode.strategicRegions')}</Tab>
        <Tab value="paint">{t('mode.paint')}</Tab>
      </TabList>
    </div>
  )
}
