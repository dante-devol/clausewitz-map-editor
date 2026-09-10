import { useState, useEffect } from 'react'
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components'
import { Shell } from '../components/layout/Shell'
import { MapView } from '../views/MapView'
import { SettingsView } from '../views/SettingsView'
import { ProjectSelectionView } from '../views/ProjectSelectionView'
import { DebugPanel } from '../components/DebugPanel'
import { useAppState } from '../hooks/useAppState'
import { useCoreStore } from '../../infra/store/coreStore'
import { useDisplayModeConfig } from '../hooks/useDisplayModeConfig'
import { useProjectSelection } from '../hooks/useProjectSelection'
import { useMapLoader } from '../hooks/useMapLoader'
import { useProvinceValidation } from '../hooks/useProvinceValidation'

const VIEWS = {
  map: <MapView />,
  provinces: <MapView />,
  settings: <SettingsView />
}

function App(): JSX.Element {
  const { theme, activeView, setActiveView, toggleTheme } = useAppState()
  const sessionCleared = useCoreStore((s) => s.sessionCleared)

  function handleBack() {
    sessionCleared()
    void window.api.window.exitEditor()
  }
  const {
    sessionStatus, sessionErrorMessage, recentProjects, gamePath, gamePathValid, gameVerification,
    pendingProject, selectProject, browseForProject, browseForGamePath,
    confirmPendingProject, cancelPendingProject, dismissSessionError, removeProject
  } = useProjectSelection()

  useDisplayModeConfig()
  useMapLoader()
  useProvinceValidation()

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

  // A project is only actually open — and the editor safe to show — once the
  // main process has confirmed it. A failed open leaves sessionStatus at
  // 'error' (see sessionFailed) even though projectPath is still set, so the
  // editor must gate on status rather than on projectPath alone.
  const isProjectOpen = sessionStatus === 'project-open' || sessionStatus === 'loading-map' || sessionStatus === 'ready'

  if (!isProjectOpen) {
    return (
      <FluentProvider theme={fluentTheme}>
        <ProjectSelectionView
          gamePath={gamePath}
          gamePathValid={gamePathValid}
          gameVerification={gameVerification}
          recentProjects={recentProjects}
          pendingProject={pendingProject}
          sessionErrorMessage={sessionErrorMessage}
          onBrowseGamePath={browseForGamePath}
          onOpen={selectProject}
          onBrowse={browseForProject}
          onRemove={removeProject}
          onConfirmPending={confirmPendingProject}
          onCancelPending={cancelPendingProject}
          onDismissSessionError={dismissSessionError}
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
        onBack={handleBack}
      >
        {VIEWS[activeView]}
      </Shell>
      <DebugPanel open={debugOpen} onClose={() => setDebugOpen(false)} />
    </FluentProvider>
  )
}

export default App
