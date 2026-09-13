import { makeStyles, tokens, Radio, RadioGroup, Text, Button, Input } from '@fluentui/react-components'
import { FolderRegular } from '@fluentui/react-icons'
import { useI18n } from '../i18n/I18nProvider'
import { SUPPORTED_APP_LOCALES, type AppLocale } from '../../../../shared/i18n'
import { useNeighborRevealConfigStore } from '../../infra/store/neighborRevealConfigStore'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalXL
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    maxWidth: '420px'
  },
  description: {
    color: tokens.colorNeutralForeground3
  }
})

export function SettingsView() {
  const styles = useStyles()
  const { localePreference, setLocalePreference, t } = useI18n()
  const neighborRingDepth = useNeighborRevealConfigStore((s) => s.ringDepth)
  const setNeighborRingDepth = useNeighborRevealConfigStore((s) => s.setRingDepth)

  return (
    <div className={styles.root}>
      <Text size={500} weight="bold">{t('settings.title')}</Text>
      <div className={styles.section}>
        <Text size={300} weight="semibold">{t('settings.language.title')}</Text>
        <Text size={200} className={styles.description}>{t('settings.language.description')}</Text>
        <RadioGroup
          value={localePreference ?? 'system'}
          layout="vertical"
          onChange={(_, data) => {
            const value = data.value as AppLocale | 'system'
            void setLocalePreference(value === 'system' ? null : value)
          }}
        >
          <Radio value="system" label={t('settings.language.system')} />
          {SUPPORTED_APP_LOCALES.map((locale) => (
            <Radio key={locale} value={locale} label={t(`settings.language.${locale}`)} />
          ))}
        </RadioGroup>
      </div>
      <div className={styles.section}>
        <Text size={300} weight="semibold">{t('settings.neighborReveal.title')}</Text>
        <Text size={200} className={styles.description}>{t('settings.neighborReveal.description')}</Text>
        <Input
          type="number"
          min={0}
          max={5}
          value={String(neighborRingDepth)}
          onChange={(_, data) => {
            const parsed = Number(data.value)
            if (Number.isNaN(parsed)) return
            void setNeighborRingDepth(parsed)
          }}
          style={{ maxWidth: '120px' }}
        />
      </div>
      <div className={styles.section}>
        <Text size={300} weight="semibold">{t('settings.data.title')}</Text>
        <Text size={200} className={styles.description}>{t('settings.data.description')}</Text>
        <Button
          appearance="secondary"
          icon={<FolderRegular />}
          onClick={() => { void window.api.app.openUserDataFolder() }}
        >
          {t('settings.data.openFolder')}
        </Button>
      </div>
    </div>
  )
}
