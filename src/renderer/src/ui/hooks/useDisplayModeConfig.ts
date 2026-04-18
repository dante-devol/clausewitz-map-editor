import { useEffect } from 'react'
import { useDisplayModeConfigStore } from '../../infra/store/displayModeConfigStore'

// Loads persisted display-mode color overrides once per app session.
export function useDisplayModeConfig(): void {
  const isLoaded = useDisplayModeConfigStore((s) => s.isLoaded)
  const loadOverrides = useDisplayModeConfigStore((s) => s.loadOverrides)

  useEffect(() => {
    if (isLoaded) return

    let cancelled = false

    window.api.settings.getValue('displayModeOverrides').then((overrides) => {
      if (!cancelled) loadOverrides(overrides ?? {})
    })

    return () => {
      cancelled = true
    }
  }, [isLoaded, loadOverrides])
}
