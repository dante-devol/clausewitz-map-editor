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
  const loadProvincesImage = useMapDataStore((s) => s.loadProvincesImage)
  const clear = useMapDataStore((s) => s.clear)

  useEffect(() => {
    if (!paths) return

    let cancelled = false

    async function load() {
      // Terrain + image are independent of the continent/definition chain.
      const [continents, terrains, imageFile] = await Promise.all([
        window.api.loadContinents(paths!.continent),
        window.api.loadTerrain(paths!.provinceTerrain),
        window.api.loadFile(paths!.provinces)
      ])
      if (cancelled) return
      loadContinents(continents)
      loadTerrains(terrains)
      loadProvincesImage(imageFile.content)

      // Definitions depend on continents to resolve numeric IDs to names.
      const provinces = await window.api.loadDefinitions(paths!.definitions, continents)
      if (cancelled) return
      loadProvinces(provinces)
    }

    load()

    const unsubscribeFile = window.api.onFileChanged((event) => {
      if (event.path === paths!.provinces) {
        window.api.readFile(event.path).then((f) => loadProvincesImage(f.content))
      }
    })

    const unsubscribe = window.api.onDataReloaded((event) => {
      if (event.type === 'continents') loadContinents(event.data as import('../../../shared/mapDataTypes').Continent[])
      else if (event.type === 'definitions') loadProvinces(event.data as import('../../../shared/mapDataTypes').Province[])
      else if (event.type === 'terrain') loadTerrains(event.data as import('../../../shared/mapDataTypes').TerrainCategory[])
    })

    return () => {
      cancelled = true
      unsubscribeFile()
      unsubscribe()
      clear()
    }
  }, [paths])
}
