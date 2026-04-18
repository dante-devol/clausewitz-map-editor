import { useEffect } from 'react'
import { useCoreApi } from '../../bridge/CoreProvider'
import { sessionCommands } from '../../core/commands/sessionCommands'
import { useCoreSelector } from '../../bridge/useCoreSelector'
import { selectCurrentProjectId } from '../../core/selectors/sessionSelectors'
import { useMapDataStore } from '../../infra/store/mapDataStore'

// Loads and keeps map data in sync for the active project session.
export function useMapLoader(): void {
  const api = useCoreApi()
  const projectId = useCoreSelector(selectCurrentProjectId)
  const loadContinents = useMapDataStore((s) => s.loadContinents)
  const loadProvinces = useMapDataStore((s) => s.loadProvinces)
  const loadTerrains = useMapDataStore((s) => s.loadTerrains)
  const loadProvincesImage = useMapDataStore((s) => s.loadProvincesImage)
  const clear = useMapDataStore((s) => s.clear)

  useEffect(() => {
    if (!projectId) return

    let cancelled = false

    async function load() {
      api.dispatch(sessionCommands.mapLoadingStarted())
      try {
        const snapshot = await window.api.map.load(projectId)
        if (cancelled) return
        loadContinents(snapshot.continents)
        loadTerrains(snapshot.terrains)
        loadProvincesImage(snapshot.provincesImageB64)
        loadProvinces(snapshot.provinces)
        api.dispatch(sessionCommands.mapReady())
      } catch (error) {
        if (cancelled) return
        api.dispatch(sessionCommands.failed(error instanceof Error ? error.message : 'Failed to load map'))
      }
    }

    load()

    const unsubscribe = window.api.map.onChanged((event) => {
      if (event.projectId !== projectId) return
      if (event.type === 'continents') loadContinents(event.data as import('../../../../shared/mapDataTypes').Continent[])
      else if (event.type === 'definitions') loadProvinces(event.data as import('../../../../shared/mapDataTypes').Province[])
      else if (event.type === 'terrain') loadTerrains(event.data as import('../../../../shared/mapDataTypes').TerrainCategory[])
      else if (event.type === 'image') loadProvincesImage(event.data as string)
    })

    return () => {
      cancelled = true
      unsubscribe()
      api.dispatch(sessionCommands.cleared())
      clear()
    }
  }, [api, projectId])
}
