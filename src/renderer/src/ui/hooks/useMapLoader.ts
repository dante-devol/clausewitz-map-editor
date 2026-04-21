import { useEffect, useRef } from 'react'
import { useCoreStore } from '../../infra/store/coreStore'
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
import { notificationService } from '../../infra/services/notificationService'
import { useI18n } from '../i18n/I18nProvider'

const provinceBitmapFactsCache = new Map<string, ProvinceBitmapFacts>()
const MAP_LOAD_TOTAL_STEPS = 4
const BITMAP_RECONCILE_TOTAL_STEPS = 5

export function useMapLoader(): void {
  const { t } = useI18n()
  const tRef = useRef(t)

  const projectId = useCoreStore((s) => s.projectId)
  const displayMode = useCoreStore((s) => s.displayMode)
  const overlays = useCoreStore((s) => s.overlays)
  const mapLoadingStarted = useCoreStore((s) => s.mapLoadingStarted)
  const mapReady = useCoreStore((s) => s.mapReady)
  const sessionFailed = useCoreStore((s) => s.sessionFailed)
  const sessionCleared = useCoreStore((s) => s.sessionCleared)

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
  const setProvinceBitmapStatus = useMapDataStore((s) => s.setProvinceBitmapStatus)
  const baseProvinceCatalog = useMapDataStore((s) => s.baseProvinceCatalog)
  const provincesImageB64 = useMapDataStore((s) => s.provincesImageB64)
  const clear = useMapDataStore((s) => s.clear)

  useEffect(() => {
    tRef.current = t
  }, [t])

  useEffect(() => {
    if (!projectId) return

    let cancelled = false
    let settled = false
    const loadScope = `map-load:${projectId}`

    async function load() {
      notificationService.beginProgress({
        scope: loadScope,
        title: tRef.current('notification.mapLoad.title'),
        message: tRef.current('notification.mapLoad.step.request'),
        progress: { current: 1, total: MAP_LOAD_TOTAL_STEPS }
      })
      mapLoadingStarted()
      try {
        const snapshot = await window.api.map.load(projectId)
        if (cancelled) return
        notificationService.advanceProgress({
          scope: loadScope,
          title: tRef.current('notification.mapLoad.title'),
          message: tRef.current('notification.mapLoad.step.datasets'),
          progress: { current: 2, total: MAP_LOAD_TOTAL_STEPS }
        })
        loadContinents(snapshot.continents)
        loadTerrains(snapshot.terrains)
        loadProvincesImage(snapshot.provincesImageB64)
        loadProvinces(snapshot.provinces)
        notificationService.advanceProgress({
          scope: loadScope,
          title: tRef.current('notification.mapLoad.title'),
          message: tRef.current('notification.mapLoad.step.catalog'),
          progress: { current: 3, total: MAP_LOAD_TOTAL_STEPS }
        })
        loadOriginalDefinitions(snapshot.provinces)
        loadProvinceCatalog(snapshot.provinceCatalog)
        setStatesStatus('idle')
        setStrategicRegionsStatus('idle')
        setProvinceBitmapStatus('idle')
        notificationService.advanceProgress({
          scope: loadScope,
          title: tRef.current('notification.mapLoad.title'),
          message: tRef.current('notification.mapLoad.step.finalize'),
          progress: { current: 4, total: MAP_LOAD_TOTAL_STEPS }
        })
        mapReady()
        notificationService.completeProgress({
          scope: loadScope,
          title: tRef.current('notification.mapLoad.doneTitle'),
          message: tRef.current('notification.mapLoad.doneMessage')
        })
        settled = true
      } catch (error) {
        if (cancelled) return
        sessionFailed(error instanceof Error ? error.message : 'Failed to load map')
        notificationService.failProgress({
          scope: loadScope,
          title: tRef.current('notification.mapLoad.failedTitle'),
          message: error instanceof Error ? error.message : tRef.current('notification.mapLoad.failedMessage')
        })
        settled = true
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
        const progress = resolveFileProgress(update.loadedFiles, update.totalFiles, resolvedPaths?.states.length ?? 0)
        notificationService.advanceProgress({
          scope: `states-load:${projectId}`,
          title: tRef.current('notification.statesLoad.title'),
          message: tRef.current('notification.statesLoad.progress', {
            loaded: progress.current,
            total: progress.total
          }),
          progress
        })
        if (update.op === 'replace') replaceStates(update.items)
        else appendStates(update.items)
      }
      else if (event.type === 'strategicRegions') {
        const update = event.data as StrategicRegionDatasetUpdate
        const progress = resolveFileProgress(update.loadedFiles, update.totalFiles, resolvedPaths?.strategicRegions.length ?? 0)
        notificationService.advanceProgress({
          scope: `strategic-regions-load:${projectId}`,
          title: tRef.current('notification.strategicRegionsLoad.title'),
          message: tRef.current('notification.strategicRegionsLoad.progress', {
            loaded: progress.current,
            total: progress.total
          }),
          progress
        })
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
      if (!settled) notificationService.dismiss(loadScope)
      unsubscribe()
      sessionCleared()
      clear()
    }
  }, [
    projectId,
    mapLoadingStarted,
    mapReady,
    sessionFailed,
    sessionCleared,
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
    resolvedPaths,
    setProvinceBitmapStatus,
    setStatesStatus,
    setStrategicRegionsStatus
  ])

  useEffect(() => {
    if (!projectId) return
    const stateOverlayVisible = overlays.some((overlay) => overlay.id === 'states' && overlay.visible)
    if (displayMode !== 'state' && !stateOverlayVisible) return
    if (useMapDataStore.getState().statesStatus !== 'idle') return

    let cancelled = false
    let settled = false
    const statesScope = `states-load:${projectId}`
    setStatesStatus('loading')
    replaceStates([])
    notificationService.beginProgress({
      scope: statesScope,
      title: tRef.current('notification.statesLoad.title'),
      message: tRef.current('notification.statesLoad.progress', {
        loaded: 0,
        total: resolvedPaths?.states.length ?? 0
      }),
      progress: {
        current: 0,
        total: Math.max(resolvedPaths?.states.length ?? 0, 1)
      }
    })

    void window.api.map.loadStates(projectId)
      .then(() => {
        if (cancelled) return
        setStatesStatus('ready')
        notificationService.completeProgress({
          scope: statesScope,
          title: tRef.current('notification.statesLoad.doneTitle'),
          message: tRef.current('notification.statesLoad.doneMessage')
        })
        settled = true
      })
      .catch((error) => {
        if (!cancelled) setStatesStatus('error')
        if (!cancelled) {
          notificationService.failProgress({
            scope: statesScope,
            title: tRef.current('notification.statesLoad.failedTitle'),
            message: error instanceof Error ? error.message : tRef.current('notification.statesLoad.failedMessage')
          })
          settled = true
        }
      })

    return () => {
      cancelled = true
      if (!settled) notificationService.dismiss(statesScope)
    }
  }, [displayMode, overlays, projectId, replaceStates, resolvedPaths, setStatesStatus])

  useEffect(() => {
    if (!projectId) return
    const strategicRegionOverlayVisible = overlays.some((overlay) => overlay.id === 'strategicRegions' && overlay.visible)
    if (displayMode !== 'strategicRegion' && !strategicRegionOverlayVisible) return
    if (useMapDataStore.getState().strategicRegionsStatus !== 'idle') return

    let cancelled = false
    let settled = false
    const strategicRegionsScope = `strategic-regions-load:${projectId}`
    setStrategicRegionsStatus('loading')
    replaceStrategicRegions([])
    notificationService.beginProgress({
      scope: strategicRegionsScope,
      title: tRef.current('notification.strategicRegionsLoad.title'),
      message: tRef.current('notification.strategicRegionsLoad.progress', {
        loaded: 0,
        total: resolvedPaths?.strategicRegions.length ?? 0
      }),
      progress: {
        current: 0,
        total: Math.max(resolvedPaths?.strategicRegions.length ?? 0, 1)
      }
    })

    void window.api.map.loadStrategicRegions(projectId)
      .then(() => {
        if (cancelled) return
        setStrategicRegionsStatus('ready')
        notificationService.completeProgress({
          scope: strategicRegionsScope,
          title: tRef.current('notification.strategicRegionsLoad.doneTitle'),
          message: tRef.current('notification.strategicRegionsLoad.doneMessage')
        })
        settled = true
      })
      .catch((error) => {
        if (!cancelled) setStrategicRegionsStatus('error')
        if (!cancelled) {
          notificationService.failProgress({
            scope: strategicRegionsScope,
            title: tRef.current('notification.strategicRegionsLoad.failedTitle'),
            message: error instanceof Error ? error.message : tRef.current('notification.strategicRegionsLoad.failedMessage')
          })
          settled = true
        }
      })

    return () => {
      cancelled = true
      if (!settled) notificationService.dismiss(strategicRegionsScope)
    }
  }, [
    displayMode,
    overlays,
    projectId,
    replaceStrategicRegions,
    resolvedPaths,
    setStrategicRegionsStatus
  ])

  useEffect(() => {
    const provincesPath = resolvedPaths?.provinces
    if (!projectId || !provincesPath || !provincesImageB64) return

    let cancelled = false
    let settled = false
    const bitmapScope = `bitmap-reconcile:${projectId}`

    async function reconcileWithBitmap(): Promise<void> {
      setProvinceBitmapStatus('loading')
      notificationService.beginProgress({
        scope: bitmapScope,
        title: tRef.current('notification.bitmapLoad.title'),
        message: tRef.current('notification.bitmapLoad.step.read'),
        progress: { current: 1, total: BITMAP_RECONCILE_TOTAL_STEPS }
      })
      const imageRecord = await window.api.files.read(provincesPath)
      if (cancelled) return

      const cachedFacts = provinceBitmapFactsCache.get(imageRecord.hash)
      notificationService.advanceProgress({
        scope: bitmapScope,
        title: tRef.current('notification.bitmapLoad.title'),
        message: tRef.current('notification.bitmapLoad.step.decode'),
        progress: { current: 2, total: BITMAP_RECONCILE_TOTAL_STEPS }
      })
      if (cachedFacts) {
        notificationService.advanceProgress({
          scope: bitmapScope,
          title: tRef.current('notification.bitmapLoad.title'),
          message: tRef.current('notification.bitmapLoad.step.cache'),
          progress: { current: 3, total: BITMAP_RECONCILE_TOTAL_STEPS }
        })
        setProvinceCatalog(reconcileProvinceCatalogWithBitmap(baseProvinceCatalog, cachedFacts))
        setProvinceBitmapStatus('ready')
        notificationService.completeProgress({
          scope: bitmapScope,
          title: tRef.current('notification.bitmapLoad.doneTitle'),
          message: tRef.current('notification.bitmapLoad.doneMessage')
        })
        settled = true
        return
      }

      const src = `data:image/bmp;base64,${provincesImageB64}`
      const source = await BmpProvinceMapSource.load(src)
      try {
        if (cancelled) return
        notificationService.advanceProgress({
          scope: bitmapScope,
          title: tRef.current('notification.bitmapLoad.title'),
          message: tRef.current('notification.bitmapLoad.step.analyze'),
          progress: { current: 3, total: BITMAP_RECONCILE_TOTAL_STEPS }
        })
        const bitmapFacts = analyzeProvinceBitmapFacts({
          data: source.pixelData,
          width: source.width,
          height: source.height
        })
        provinceBitmapFactsCache.set(imageRecord.hash, bitmapFacts)
        if (cancelled) return
        notificationService.advanceProgress({
          scope: bitmapScope,
          title: tRef.current('notification.bitmapLoad.title'),
          message: tRef.current('notification.bitmapLoad.step.catalog'),
          progress: { current: 4, total: BITMAP_RECONCILE_TOTAL_STEPS }
        })
        const reconciledCatalog = reconcileProvinceCatalogWithBitmap(baseProvinceCatalog, bitmapFacts)
        setProvinceCatalog(reconciledCatalog)
        syncBmpOnlyEntries(
          reconciledCatalog
            .filter((e) => e.sources.includes('bmp-color') && e.color !== null)
            .map((e) => e.color as number)
        )
        setProvinceBitmapStatus('ready')
        notificationService.advanceProgress({
          scope: bitmapScope,
          title: tRef.current('notification.bitmapLoad.title'),
          message: tRef.current('notification.bitmapLoad.step.sync'),
          progress: { current: 5, total: BITMAP_RECONCILE_TOTAL_STEPS }
        })
        notificationService.completeProgress({
          scope: bitmapScope,
          title: tRef.current('notification.bitmapLoad.doneTitle'),
          message: tRef.current('notification.bitmapLoad.doneMessage')
        })
        settled = true
      } finally {
        source.dispose()
      }
    }

    void reconcileWithBitmap().catch((error) => {
      if (!cancelled) {
        setProvinceCatalog(baseProvinceCatalog)
        setProvinceBitmapStatus('error')
        notificationService.failProgress({
          scope: bitmapScope,
          title: tRef.current('notification.bitmapLoad.failedTitle'),
          message: error instanceof Error ? error.message : tRef.current('notification.bitmapLoad.failedMessage')
        })
        settled = true
      }
    })

    return () => {
      cancelled = true
      if (!settled) notificationService.dismiss(bitmapScope)
    }
  }, [baseProvinceCatalog, projectId, provincesImageB64, resolvedPaths, setProvinceBitmapStatus, setProvinceCatalog, syncBmpOnlyEntries])
}

function resolveFileProgress(
  loadedFiles: number | undefined,
  totalFiles: number | undefined,
  fallbackTotal: number
): { current: number; total: number } {
  const safeTotal = normalizeProgressNumber(totalFiles, fallbackTotal)
  const total = Math.max(safeTotal, 1)
  const current = Math.min(normalizeProgressNumber(loadedFiles, 0), total)
  return { current, total }
}

function normalizeProgressNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
