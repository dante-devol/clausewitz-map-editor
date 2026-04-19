import { useEffect } from 'react'
import { useCoreApi } from '../../bridge/CoreProvider'
import { sessionCommands } from '../../core/commands/sessionCommands'
import { useCoreSelector } from '../../bridge/useCoreSelector'
import { selectCurrentProjectId } from '../../core/selectors/sessionSelectors'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import {
  buildProvinceCatalog,
  reconcileProvinceCatalogWithBitmap,
  type ProvinceBitmapFacts
} from '../../../../shared/provinceCatalog'
import { BmpProvinceMapSource } from '../../infra/lib/BmpProvinceMapSource'
import { analyzeProvinceBitmapFacts } from '../../infra/lib/provinceBitmapFacts'
import { useProjectStore } from '../../infra/store/projectStore'

const provinceBitmapFactsCache = new Map<string, ProvinceBitmapFacts>()

// Loads and keeps map data in sync for the active project session.
export function useMapLoader(): void {
  const api = useCoreApi()
  const projectId = useCoreSelector(selectCurrentProjectId)
  const resolvedPaths = useProjectStore((s) => s.resolvedPaths)
  const loadContinents = useMapDataStore((s) => s.loadContinents)
  const loadProvinces = useMapDataStore((s) => s.loadProvinces)
  const loadProvinceCatalog = useMapDataStore((s) => s.loadProvinceCatalog)
  const setProvinceCatalog = useMapDataStore((s) => s.setProvinceCatalog)
  const loadTerrains = useMapDataStore((s) => s.loadTerrains)
  const loadProvincesImage = useMapDataStore((s) => s.loadProvincesImage)
  const baseProvinceCatalog = useMapDataStore((s) => s.baseProvinceCatalog)
  const provincesImageB64 = useMapDataStore((s) => s.provincesImageB64)
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
        loadProvinceCatalog(snapshot.provinceCatalog)
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
      else if (event.type === 'definitions') {
        const provinces = event.data as import('../../../../shared/mapDataTypes').Province[]
        loadProvinces(provinces)
        loadProvinceCatalog(buildProvinceCatalog(provinces))
      }
      else if (event.type === 'terrain') loadTerrains(event.data as import('../../../../shared/mapDataTypes').TerrainCategory[])
      else if (event.type === 'image') loadProvincesImage(event.data as string)
    })

    return () => {
      cancelled = true
      unsubscribe()
      api.dispatch(sessionCommands.cleared())
      clear()
    }
  }, [api, clear, loadContinents, loadProvinceCatalog, loadProvinces, loadProvincesImage, loadTerrains, projectId])

  useEffect(() => {
    const provincesPath = resolvedPaths?.provinces
    if (!projectId || !provincesPath || !provincesImageB64) return

    let cancelled = false

    async function reconcileWithBitmap(): Promise<void> {
      const imageRecord = await window.api.files.read(provincesPath)
      if (cancelled) return

      const cachedFacts = provinceBitmapFactsCache.get(imageRecord.hash)
      if (cachedFacts) {
        setProvinceCatalog(reconcileProvinceCatalogWithBitmap(baseProvinceCatalog, cachedFacts))
        return
      }

      const src = `data:image/bmp;base64,${provincesImageB64}`
      const source = await BmpProvinceMapSource.load(src)
      try {
        if (cancelled) return
        const bitmapFacts = analyzeProvinceBitmapFacts({
          data: source.pixelData,
          width: source.width,
          height: source.height
        })
        provinceBitmapFactsCache.set(imageRecord.hash, bitmapFacts)
        if (cancelled) return
        setProvinceCatalog(reconcileProvinceCatalogWithBitmap(baseProvinceCatalog, bitmapFacts))
      } finally {
        source.dispose()
      }
    }

    void reconcileWithBitmap().catch(() => {
      if (!cancelled) setProvinceCatalog(baseProvinceCatalog)
    })

    return () => {
      cancelled = true
    }
  }, [baseProvinceCatalog, projectId, provincesImageB64, resolvedPaths, setProvinceCatalog])
}
