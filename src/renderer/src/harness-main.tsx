import { createRoot } from 'react-dom/client'
import './ui/app/index.css'
import App from './ui/app/App'
import { MapQueryProvider } from './bridge/MapQueryProvider'
import { I18nProvider } from './ui/i18n/I18nProvider'
import { useCoreStore } from './infra/store/coreStore'
import { useProjectStore } from './infra/store/projectStore'
import { createMockApi } from './harness-mockApi'

// Dev-only entry point (served at /harness.html, only reachable from the Vite
// dev server — see docs/testing-issue-4.md). Installs a mock window.api
// backed by scripts/harness-server.ts, then seeds the session directly into
// 'project-open' so App.tsx renders MapView immediately instead of the
// project-selection screen (which depends on real Electron dialogs).
//
// Deliberately not wrapped in <StrictMode>: useMapLoader's effect cleanup
// unconditionally calls sessionCleared(), and StrictMode's dev-only
// mount/cleanup/remount cycle runs that cleanup before the initial map.load()
// resolves, resetting the session back to 'idle' before anything can render.
// That's a real fragility in that cleanup, but reproducing it isn't this
// harness's job — see the note left for it separately.
window.api = createMockApi()

const port = new URLSearchParams(window.location.search).get('port') ?? '4455'

async function boot(): Promise<void> {
  const { projectId, resolvedPaths } = await fetch(`http://localhost:${port}/api/resolvedPaths`).then((r) => r.json())
  useProjectStore.getState().setResolvedPaths(resolvedPaths)
  useCoreStore.getState().projectOpened(projectId, '/harness/fixture-mod')
  // Exposed for poking state from devtools/automation while testing.
  ;(window as any).__coreStore = useCoreStore
  ;(window as any).__projectStore = useProjectStore

  createRoot(document.getElementById('root')!).render(
    <MapQueryProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </MapQueryProvider>
  )
}

void boot()
