import { useState, useEffect } from 'react'
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components'
import { Shell } from '../components/layout/Shell'
import { MapView } from '../views/MapView'
import { SettingsView } from '../views/SettingsView'
import { ProjectSelectionView } from '../views/ProjectSelectionView'
import { DebugPanel } from '../components/DebugPanel'
import { useAppState } from '../hooks/useAppState'
import { useDisplayModeConfig } from '../hooks/useDisplayModeConfig'
import { useProjectSelection } from '../hooks/useProjectSelection'
import { useMapLoader } from '../hooks/useMapLoader'

const VIEWS = {
  map: <MapView />,
  provinces: <MapView />,
  settings: <SettingsView />
}

function App(): JSX.Element {
  const { theme, activeView, setActiveView, toggleTheme } = useAppState()
  const {
    currentProject, recentProjects, gamePath, gamePathValid, gameVerification,
    pendingProject, selectProject, browseForProject, browseForGamePath,
    confirmPendingProject, cancelPendingProject, removeProject
  } = useProjectSelection()

  useDisplayModeConfig()
  useMapLoader()

  const [debugOpen, setDebugOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setDebugOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const fluentTheme = theme === 'dark' ? webDarkTheme : webLightTheme

  if (!currentProject) {
    return (
      <FluentProvider theme={fluentTheme}>
        <ProjectSelectionView
          gamePath={gamePath}
          gamePathValid={gamePathValid}
          gameVerification={gameVerification}
          recentProjects={recentProjects}
          pendingProject={pendingProject}
          onBrowseGamePath={browseForGamePath}
          onOpen={selectProject}
          onBrowse={browseForProject}
          onRemove={removeProject}
          onConfirmPending={confirmPendingProject}
          onCancelPending={cancelPendingProject}
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
      <DebugPanel open={debugOpen} onClose={() => setDebugOpen(false)} />
    </FluentProvider>
  )
}

export default App
