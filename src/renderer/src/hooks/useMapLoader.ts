import { useEffect } from 'react'
import { useResolvedPathsStore } from '../store/resolvedPathsStore'
import { useMapDataStore } from '../store/mapDataStore'

// Watches for resolved paths and loads map data once they are available.
// Must be called strictly after path resolution — will no-op until paths exist.
export function useMapLoader(): void {
  const paths = useResolvedPathsStore((s) => s.paths)
  const loadContinents = useMapDataStore((s) => s.loadContinents)
  const loadProvinces = useMapDataStore((s) => s.loadProvinces)
  const loadTerrains = useMapDataStore((s) => s.loadTerrains)
  const clear = useMapDataStore((s) => s.clear)

  useEffect(() => {
    if (!paths) return

    let cancelled = false

    async function load() {
      // Terrain is independent — load it in parallel with the continent/definition chain.
      const [continents, terrains] = await Promise.all([
        window.api.loadContinents(paths!.continent),
        window.api.loadTerrain(paths!.provinceTerrain)
      ])
      if (cancelled) return
      loadContinents(continents)
      loadTerrains(terrains)

      // Definitions depend on continents to resolve numeric IDs to names.
      const provinces = await window.api.loadDefinitions(paths!.definitions, continents)
      if (cancelled) return
      loadProvinces(provinces)
    }

    load()

    return () => {
      cancelled = true
      clear()
    }
  }, [paths])
}
