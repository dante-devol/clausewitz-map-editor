import { useEffect } from 'react'
import { useNeighborRevealConfigStore } from '../../infra/store/neighborRevealConfigStore'

// Loads the persisted neighbor-reveal ring depth once per app session.
export function useNeighborRevealConfig(): void {
  const isLoaded = useNeighborRevealConfigStore((s) => s.isLoaded)
  const load = useNeighborRevealConfigStore((s) => s.load)

  useEffect(() => {
    if (isLoaded) return

    let cancelled = false

    window.api.settings.getValue('neighborRevealRingDepth').then((ringDepth) => {
      if (!cancelled) load(ringDepth ?? 1)
    })

    return () => {
      cancelled = true
    }
  }, [isLoaded, load])
}
