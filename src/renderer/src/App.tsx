import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components'
import { Shell } from './components/layout/Shell'
import { MapView } from './views/MapView'
import { SettingsView } from './views/SettingsView'
import { useAppState } from './hooks/useAppState'

const VIEWS = {
  map: <MapView />,
  provinces: <MapView />,
  settings: <SettingsView />
}

function App(): JSX.Element {
  const { theme, activeView, setActiveView, toggleTheme } = useAppState()

  return (
    <FluentProvider theme={theme === 'dark' ? webDarkTheme : webLightTheme}>
      <Shell
        activeView={activeView}
        theme={theme}
        onViewChange={setActiveView}
        onToggleTheme={toggleTheme}
      >
        {VIEWS[activeView]}
      </Shell>
    </FluentProvider>
  )
}

export default App
