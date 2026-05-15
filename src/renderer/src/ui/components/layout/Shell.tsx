import {
  makeStyles,
  tokens,
  Button,
  Text,
  Tooltip
} from '@fluentui/react-components'
import {
  ArrowLeftRegular,
  MapRegular,
  SettingsRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular
} from '@fluentui/react-icons'
import type { View, Theme } from '../../../core/contracts/CoreState'
import { useI18n } from '../../i18n/I18nProvider'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    width: '48px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    alignItems: 'center',
    paddingTop: tokens.spacingVerticalM,
    gap: tokens.spacingVerticalS
  },
  sidebarBottom: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: tokens.spacingVerticalM,
    gap: tokens.spacingVerticalS
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden'
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    height: '32px',
    paddingLeft: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    WebkitAppRegion: 'drag' as never,
    userSelect: 'none'
  },
  content: {
    flex: 1,
    overflow: 'auto'
  }
})

interface ShellProps {
  activeView: View
  theme: Theme
  onViewChange: (view: View) => void
  onToggleTheme: () => void
  onBack: () => void
  children: React.ReactNode
}

const NAV_ITEMS: { view: View; icon: React.ReactNode; labelKey: 'shell.nav.map' | 'shell.nav.settings' }[] = [
  { view: 'map', icon: <MapRegular />, labelKey: 'shell.nav.map' },
  { view: 'settings', icon: <SettingsRegular />, labelKey: 'shell.nav.settings' }
]

export function Shell({ activeView, theme, onViewChange, onToggleTheme, onBack, children }: ShellProps) {
  const styles = useStyles()
  const { t } = useI18n()

  return (
    <div className={styles.root}>
      <nav className={styles.sidebar}>
        {NAV_ITEMS.map(({ view, icon, labelKey }) => (
          <Tooltip key={view} content={t(labelKey)} relationship="label" positioning="after">
            <Button
              appearance={activeView === view ? 'primary' : 'subtle'}
              icon={icon}
              onClick={() => onViewChange(view)}
            />
          </Tooltip>
        ))}

        <div className={styles.sidebarBottom}>
          <Tooltip content={t('shell.nav.back')} relationship="label" positioning="after">
            <Button appearance="subtle" icon={<ArrowLeftRegular />} onClick={onBack} />
          </Tooltip>
          <Tooltip
            content={theme === 'dark' ? t('shell.theme.light') : t('shell.theme.dark')}
            relationship="label"
            positioning="after"
          >
            <Button
              appearance="subtle"
              icon={theme === 'dark' ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
              onClick={onToggleTheme}
            />
          </Tooltip>
        </div>
      </nav>

      <div className={styles.main}>
        <div className={styles.titleBar}>
          <Text size={100} weight="semibold">{t('app.title')}</Text>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
