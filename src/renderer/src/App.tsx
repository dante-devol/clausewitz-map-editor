import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components'
import { Shell } from './components/layout/Shell'
import { MapView } from './views/MapView'
import { SettingsView } from './views/SettingsView'
import { ProjectSelectionView } from './views/ProjectSelectionView'
import { useAppState } from './hooks/useAppState'
import { useProjectSelection } from './hooks/useProjectSelection'

const VIEWS = {
  map: <MapView />,
  provinces: <MapView />,
  settings: <SettingsView />
}

function App(): JSX.Element {
  const { theme, activeView, setActiveView, toggleTheme } = useAppState()
  const { currentProject, recentProjects, openProject, browseForProject, removeProject } =
    useProjectSelection()

  const fluentTheme = theme === 'dark' ? webDarkTheme : webLightTheme

  if (!currentProject) {
    return (
      <FluentProvider theme={fluentTheme}>
        <ProjectSelectionView
          recentProjects={recentProjects}
          onOpen={openProject}
          onBrowse={browseForProject}
          onRemove={removeProject}
        />
      </FluentProvider>
    )
  }

  return (
    <FluentProvider theme={fluentTheme}>
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
