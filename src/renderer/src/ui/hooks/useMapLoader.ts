import { useEffect } from 'react'
import { useCoreApi } from '../../bridge/CoreProvider'
import { sessionCommands } from '../../core/commands/sessionCommands'
import { useCoreSelector } from '../../bridge/useCoreSelector'
import { selectDisplayMode } from '../../core/selectors/mapSelectors'
import { selectCurrentProjectId } from '../../core/selectors/sessionSelectors'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import {
  buildProvinceCatalog,
  reconcileProvinceCatalogWithBitmap,
  type ProvinceBitmapFacts
} from '../../../../shared/provinceCatalog'
import type { StateDatasetUpdate, StrategicRegionDatasetUpdate } from '../../../../shared/contract/api'
import { BmpProvinceMapSource } from '../../infra/lib/BmpProvinceMapSource'
import { analyzeProvinceBitmapFacts } from '../../infra/lib/provinceBitmapFacts'
import { useProjectStore } from '../../infra/store/projectStore'

const provinceBitmapFactsCache = new Map<string, ProvinceBitmapFacts>()

// Loads and keeps map data in sync for the active project session.
export function useMapLoader(): void {
  const api = useCoreApi()
  const projectId = useCoreSelector(selectCurrentProjectId)
  const displayMode = useCoreSelector(selectDisplayMode)
  const resolvedPaths = useProjectStore((s) => s.resolvedPaths)
  const loadContinents = useMapDataStore((s) => s.loadContinents)
  const loadProvinces = useMapDataStore((s) => s.loadProvinces)
  const loadProvinceCatalog = useMapDataStore((s) => s.loadProvinceCatalog)
  const setProvinceCatalog = useMapDataStore((s) => s.setProvinceCatalog)
  const loadOriginalDefinitions = useMapDataStore((s) => s.loadOriginalDefinitions)
  const syncBmpOnlyEntries = useMapDataStore((s) => s.syncBmpOnlyEntries)
  const loadTerrains = useMapDataStore((s) => s.loadTerrains)
  const replaceStates = useMapDataStore((s) => s.replaceStates)
  const appendStates = useMapDataStore((s) => s.appendStates)
  const replaceStrategicRegions = useMapDataStore((s) => s.replaceStrategicRegions)
  const appendStrategicRegions = useMapDataStore((s) => s.appendStrategicRegions)
  const loadProvincesImage = useMapDataStore((s) => s.loadProvincesImage)
  const setStatesStatus = useMapDataStore((s) => s.setStatesStatus)
  const setStrategicRegionsStatus = useMapDataStore((s) => s.setStrategicRegionsStatus)
  const statesStatus = useMapDataStore((s) => s.statesStatus)
  const strategicRegionsStatus = useMapDataStore((s) => s.strategicRegionsStatus)
  const setProvinceBitmapStatus = useMapDataStore((s) => s.setProvinceBitmapStatus)
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
        loadOriginalDefinitions(snapshot.provinces)
        loadProvinceCatalog(snapshot.provinceCatalog)
        setStatesStatus('idle')
        setStrategicRegionsStatus('idle')
        setProvinceBitmapStatus('idle')
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
        setProvinceBitmapStatus('idle')
      }
      else if (event.type === 'terrain') loadTerrains(event.data as import('../../../../shared/mapDataTypes').TerrainCategory[])
      else if (event.type === 'states') {
        const update = event.data as StateDatasetUpdate
        if (update.op === 'replace') replaceStates(update.items)
        else appendStates(update.items)
      }
      else if (event.type === 'strategicRegions') {
        const update = event.data as StrategicRegionDatasetUpdate
        if (update.op === 'replace') replaceStrategicRegions(update.items)
        else appendStrategicRegions(update.items)
      }
      else if (event.type === 'image') {
        loadProvincesImage(event.data as string)
        setProvinceBitmapStatus('idle')
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
      api.dispatch(sessionCommands.cleared())
      clear()
    }
  }, [
    api,
    clear,
    loadContinents,
    loadOriginalDefinitions,
    loadProvinceCatalog,
    loadProvinces,
    loadProvincesImage,
    replaceStates,
    appendStates,
    replaceStrategicRegions,
    appendStrategicRegions,
    loadTerrains,
    projectId,
    setProvinceBitmapStatus,
    setStatesStatus,
    setStrategicRegionsStatus
  ])

  useEffect(() => {
    if (!projectId) return
    if (displayMode !== 'state' || statesStatus !== 'idle') return

    let cancelled = false
    setStatesStatus('loading')
    replaceStates([])

    void window.api.map.loadStates(projectId)
      .then(() => {
        if (cancelled) return
        setStatesStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatesStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [displayMode, projectId, replaceStates, setStatesStatus, statesStatus])

  useEffect(() => {
    if (!projectId) return
    if (displayMode !== 'strategicRegion' || strategicRegionsStatus !== 'idle') return

    let cancelled = false
    setStrategicRegionsStatus('loading')
    replaceStrategicRegions([])

    void window.api.map.loadStrategicRegions(projectId)
      .then(() => {
        if (cancelled) return
        setStrategicRegionsStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStrategicRegionsStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [
    displayMode,
    projectId,
    replaceStrategicRegions,
    setStrategicRegionsStatus,
    strategicRegionsStatus
  ])

  useEffect(() => {
    const provincesPath = resolvedPaths?.provinces
    if (!projectId || !provincesPath || !provincesImageB64) return

    let cancelled = false

    async function reconcileWithBitmap(): Promise<void> {
      setProvinceBitmapStatus('loading')
      const imageRecord = await window.api.files.read(provincesPath)
      if (cancelled) return

      const cachedFacts = provinceBitmapFactsCache.get(imageRecord.hash)
      if (cachedFacts) {
        setProvinceCatalog(reconcileProvinceCatalogWithBitmap(baseProvinceCatalog, cachedFacts))
        setProvinceBitmapStatus('ready')
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
        const reconciledCatalog = reconcileProvinceCatalogWithBitmap(baseProvinceCatalog, bitmapFacts)
        setProvinceCatalog(reconciledCatalog)
        syncBmpOnlyEntries(
          reconciledCatalog
            .filter((e) => e.sources.includes('bmp-color') && e.color !== null)
            .map((e) => e.color as number)
        )
        setProvinceBitmapStatus('ready')
      } finally {
        source.dispose()
      }
    }

    void reconcileWithBitmap().catch(() => {
      if (!cancelled) {
        setProvinceCatalog(baseProvinceCatalog)
        setProvinceBitmapStatus('error')
      }
    })

    return () => {
      cancelled = true
    }
  }, [baseProvinceCatalog, projectId, provincesImageB64, resolvedPaths, setProvinceBitmapStatus, setProvinceCatalog, syncBmpOnlyEntries])
}
