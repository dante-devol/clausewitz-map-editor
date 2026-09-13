import { useState, useEffect, useCallback, useRef } from 'react'
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components'
import { Shell } from '../components/layout/Shell'
import { MapView } from '../views/MapView'
import { DataView } from '../views/DataView'
import { SettingsView } from '../views/SettingsView'
import { ProjectSelectionView } from '../views/ProjectSelectionView'
import { DebugPanel } from '../components/DebugPanel'
import { useAppState } from '../hooks/useAppState'
import { useCoreStore } from '../../infra/store/coreStore'
import { useMapDataStore, selectHasUnsavedChanges } from '../../infra/store/mapDataStore'
import { useDisplayModeConfig } from '../hooks/useDisplayModeConfig'
import { useProjectSelection } from '../hooks/useProjectSelection'
import { useMapLoader } from '../hooks/useMapLoader'
import { useProvinceValidation } from '../hooks/useProvinceValidation'
import { useI18n } from '../i18n/I18nProvider'

const VIEWS = {
  map: <MapView />,
  provinces: <MapView />,
  data: <DataView />,
  settings: <SettingsView />
}

function App(): JSX.Element {
  const { t } = useI18n()
  const { theme, activeView, setActiveView, toggleTheme } = useAppState()
  const projectId = useCoreStore((s) => s.projectId)
  const sessionCleared = useCoreStore((s) => s.sessionCleared)
  const hasUnsavedChanges = useMapDataStore(selectHasUnsavedChanges)

  // Asks the user before discarding unsaved changes. Resolves true when
  // there's nothing to lose, or the user chose to leave anyway.
  const confirmDiscardUnsavedChanges = useCallback(async () => {
    if (!hasUnsavedChanges) return true
    return window.api.dialogs.confirm({
      title: t('app.unsavedChanges.title'),
      message: t('app.unsavedChanges.message'),
      confirmLabel: t('app.unsavedChanges.confirm'),
      cancelLabel: t('app.unsavedChanges.cancel')
    })
  }, [hasUnsavedChanges, t])

  // Tears down the current project's main-process session (file watchers,
  // worker pool) instead of leaving it running until a new project opens.
  const closeCurrentProject = useCallback(async () => {
    if (projectId) await window.api.projects.close(projectId)
    sessionCleared()
  }, [projectId, sessionCleared])

  async function handleBack() {
    if (!(await confirmDiscardUnsavedChanges())) return
    await closeCurrentProject()
    await window.api.window.exitEditor()
  }

  // Read the latest confirm/close logic without re-subscribing onBeforeClose
  // on every change to hasUnsavedChanges/projectId.
  const handleWindowCloseRef = useRef<() => void>(() => {})
  handleWindowCloseRef.current = () => {
    void (async () => {
      if (!(await confirmDiscardUnsavedChanges())) return
      await closeCurrentProject()
      await window.api.window.confirmClose()
    })()
  }

  useEffect(() => {
    return window.api.window.onBeforeClose(() => handleWindowCloseRef.current())
  }, [])

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
