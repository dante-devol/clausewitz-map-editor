import {
  makeStyles,
  tokens,
  Button,
  Text,
  Tooltip
} from '@fluentui/react-components'
import {
  MapRegular,
  SettingsRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular
} from '@fluentui/react-icons'
import type { View, Theme } from '../../hooks/useAppState'

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
  children: React.ReactNode
}

const NAV_ITEMS: { view: View; icon: React.ReactNode; label: string }[] = [
  { view: 'map', icon: <MapRegular />, label: 'Map' },
  { view: 'settings', icon: <SettingsRegular />, label: 'Settings' }
]

export function Shell({ activeView, theme, onViewChange, onToggleTheme, children }: ShellProps) {
  const styles = useStyles()

  return (
    <div className={styles.root}>
      <nav className={styles.sidebar}>
        {NAV_ITEMS.map(({ view, icon, label }) => (
          <Tooltip key={view} content={label} relationship="label" positioning="after">
            <Button
              appearance={activeView === view ? 'primary' : 'subtle'}
              icon={icon}
              onClick={() => onViewChange(view)}
            />
          </Tooltip>
        ))}

        <div className={styles.sidebarBottom}>
          <Tooltip
            content={theme === 'dark' ? 'Light mode' : 'Dark mode'}
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
          <Text size={100} weight="semibold">HOI4 Map Editor</Text>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
