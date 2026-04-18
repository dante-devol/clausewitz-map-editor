import { makeStyles, tokens, Radio, RadioGroup, Text } from '@fluentui/react-components'
import { useI18n } from '../i18n/I18nProvider'
import { SUPPORTED_APP_LOCALES, type AppLocale } from '../../../../shared/i18n'

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
    </div>
  )
}
