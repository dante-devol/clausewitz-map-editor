import { useEffect, useRef } from 'react'
import { useCoreStore } from '../../infra/store/coreStore'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import {
  buildProvinceCatalog,
  reconcileProvinceCatalogWithBitmap,
  type ProvinceBitmapFacts
} from '../../../../shared/provinceCatalog'
import type { ImageChangedData, StateDatasetUpdate, StrategicRegionDatasetUpdate } from '../../../../shared/contract/api'
import type { BitmapAnalysisOutput } from '../../infra/workers/bitmapAnalysis.worker'
import { useProjectStore } from '../../infra/store/projectStore'
import { notificationService } from '../../infra/services/notificationService'
import { useNotificationStore } from '../../infra/store/notificationStore'
import { useI18n } from '../i18n/I18nProvider'

const provinceBitmapFactsCache = new Map<string, ProvinceBitmapFacts>()
const MAP_LOAD_TOTAL_STEPS = 4
const BITMAP_RECONCILE_TOTAL_STEPS = 4

function runBitmapAnalysis(b64: string, signal: AbortSignal): Promise<ProvinceBitmapFacts> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../../infra/workers/bitmapAnalysis.worker.ts', import.meta.url),
      { type: 'module' }
    )
    const cleanup = () => worker.terminate()
    worker.onmessage = (e: MessageEvent<BitmapAnalysisOutput>) => { cleanup(); resolve(e.data.facts) }
    worker.onerror = (e) => { cleanup(); reject(new Error(e.message)) }
    signal.addEventListener('abort', () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')) }, { once: true })
    worker.postMessage({ b64 })
  })
}

export function useMapLoader(): void {
  const { t } = useI18n()
  const tRef = useRef(t)

  const projectId = useCoreStore((s) => s.projectId)
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
  const loadStateCategories = useMapDataStore((s) => s.loadStateCategories)
  const loadBuildings = useMapDataStore((s) => s.loadBuildings)
  const replaceStates = useMapDataStore((s) => s.replaceStates)
  const appendStates = useMapDataStore((s) => s.appendStates)
  const patchStates = useMapDataStore((s) => s.patchStates)
  const replaceStrategicRegions = useMapDataStore((s) => s.replaceStrategicRegions)
  const appendStrategicRegions = useMapDataStore((s) => s.appendStrategicRegions)
  const patchStrategicRegions = useMapDataStore((s) => s.patchStrategicRegions)
  const loadProvincesImage = useMapDataStore((s) => s.loadProvincesImage)
  const setStatesStatus = useMapDataStore((s) => s.setStatesStatus)
  const setStrategicRegionsStatus = useMapDataStore((s) => s.setStrategicRegionsStatus)
  const setProvinceBitmapStatus = useMapDataStore((s) => s.setProvinceBitmapStatus)
  const baseProvinceCatalog = useMapDataStore((s) => s.baseProvinceCatalog)
  const provincesImageB64 = useMapDataStore((s) => s.provincesImageB64)
  const provincesImageHash = useMapDataStore((s) => s.provincesImageHash)
  const clear = useMapDataStore((s) => s.clear)

  const startDatasetsRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    tRef.current = t
  }, [t])

  useEffect(() => {
    if (!projectId) return

    let cancelled = false
    let settled = false
    let statesSettled = false
    let strategicRegionsSettled = false
    const loadScope = `map-load:${projectId}`
    const statesScope = `states-load:${projectId}`
    const strategicRegionsScope = `strategic-regions-load:${projectId}`
    const patchReloadScope = `file-patch-reload:${projectId}`
    const patchedFiles = new Set<string>()

    async function loadStatesAsync() {
      if (cancelled || useMapDataStore.getState().statesStatus !== 'idle') return
      setStatesStatus('loading')
      replaceStates([])
      notificationService.beginProgress({
        scope: statesScope,
        title: tRef.current('notification.statesLoad.title'),
        message: tRef.current('notification.statesLoad.progress', {
          loaded: 0,
          total: resolvedPaths?.states.length ?? 0
        }),
        progress: { current: 0, total: Math.max(resolvedPaths?.states.length ?? 0, 1) }
      })
      try {
        await window.api.map.loadStates(projectId)
        if (cancelled) return
        setStatesStatus('ready')
        notificationService.completeProgress({
          scope: statesScope,
          title: tRef.current('notification.statesLoad.doneTitle'),
          message: tRef.current('notification.statesLoad.doneMessage')
        })
      } catch (error) {
        if (cancelled) return
        setStatesStatus('error')
        notificationService.failProgress({
          scope: statesScope,
          title: tRef.current('notification.statesLoad.failedTitle'),
          message: error instanceof Error ? error.message : tRef.current('notification.statesLoad.failedMessage')
        })
      } finally {
        statesSettled = true
      }
    }

    async function loadStrategicRegionsAsync() {
      if (cancelled || useMapDataStore.getState().strategicRegionsStatus !== 'idle') return
      setStrategicRegionsStatus('loading')
      replaceStrategicRegions([])
      notificationService.beginProgress({
        scope: strategicRegionsScope,
        title: tRef.current('notification.strategicRegionsLoad.title'),
        message: tRef.current('notification.strategicRegionsLoad.progress', {
          loaded: 0,
          total: resolvedPaths?.strategicRegions.length ?? 0
        }),
        progress: { current: 0, total: Math.max(resolvedPaths?.strategicRegions.length ?? 0, 1) }
      })
      try {
        await window.api.map.loadStrategicRegions(projectId)
        if (cancelled) return
        setStrategicRegionsStatus('ready')
        notificationService.completeProgress({
          scope: strategicRegionsScope,
          title: tRef.current('notification.strategicRegionsLoad.doneTitle'),
          message: tRef.current('notification.strategicRegionsLoad.doneMessage')
        })
      } catch (error) {
        if (cancelled) return
        setStrategicRegionsStatus('error')
        notificationService.failProgress({
          scope: strategicRegionsScope,
          title: tRef.current('notification.strategicRegionsLoad.failedTitle'),
          message: error instanceof Error ? error.message : tRef.current('notification.strategicRegionsLoad.failedMessage')
        })
      } finally {
        strategicRegionsSettled = true
      }
    }

    startDatasetsRef.current = () => {
      void loadStatesAsync()
      void loadStrategicRegionsAsync()
    }

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
        loadStateCategories(snapshot.stateCategories)
        loadBuildings(snapshot.buildings)
        loadProvincesImage(snapshot.provincesImageB64, snapshot.provincesImageHash)
        loadProvinces(snapshot.provinces)
        notificationService.advanceProgress({
          scope: loadScope,
          title: tRef.current('notification.mapLoad.title'),
          message: tRef.current('notification.mapLoad.step.catalog'),
          progress: { current: 3, total: MAP_LOAD_TOTAL_STEPS }
        })
        loadOriginalDefinitions(snapshot.provinces)
        loadProvinceCatalog(snapshot.provinceCatalog)
        setProvinceBitmapStatus('idle')
        notificationService.advanceProgress({
          scope: loadScope,
          title: tRef.current('notification.mapLoad.title'),
          message: tRef.current('notification.mapLoad.step.finalize'),
          progress: { current: 4, total: MAP_LOAD_TOTAL_STEPS }
        })
        mapReady()
        startDatasetsRef.current?.()
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
      else if (event.type === 'stateCategories') loadStateCategories(event.data as import('../../../../shared/mapDataTypes').StateCategory[])
      else if (event.type === 'buildings') loadBuildings(event.data as import('../../../../shared/mapDataTypes').Building[])
      else if (event.type === 'states') {
        const update = event.data as StateDatasetUpdate
        if (update.op === 'patch') {
          patchStates(update.sourcePath!, update.items)
          showPatchReloadToast(update.sourcePath!, patchedFiles, patchReloadScope, tRef.current('notification.fileReload.title'))
        } else {
          const progress = resolveFileProgress(update.loadedFiles, update.totalFiles, resolvedPaths?.states.length ?? 0)
          notificationService.advanceProgress({
            scope: statesScope,
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
      }
      else if (event.type === 'strategicRegions') {
        const update = event.data as StrategicRegionDatasetUpdate
        if (update.op === 'patch') {
          patchStrategicRegions(update.sourcePath!, update.items)
          showPatchReloadToast(update.sourcePath!, patchedFiles, patchReloadScope, tRef.current('notification.fileReload.title'))
        } else {
          const progress = resolveFileProgress(update.loadedFiles, update.totalFiles, resolvedPaths?.strategicRegions.length ?? 0)
          notificationService.advanceProgress({
            scope: strategicRegionsScope,
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
      }
      else if (event.type === 'image') {
        const imageData = event.data as ImageChangedData
        loadProvincesImage(imageData.b64, imageData.hash)
        setProvinceBitmapStatus('idle')
      }
    })

    return () => {
      cancelled = true
      startDatasetsRef.current = null
      if (!settled) notificationService.dismiss(loadScope)
      if (!statesSettled) notificationService.dismiss(statesScope)
      if (!strategicRegionsSettled) notificationService.dismiss(strategicRegionsScope)
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
    patchStates,
    replaceStrategicRegions,
    appendStrategicRegions,
    patchStrategicRegions,
    loadTerrains,
    loadStateCategories,
    loadBuildings,
    resolvedPaths,
    setProvinceBitmapStatus,
    setStatesStatus,
    setStrategicRegionsStatus
  ])

  useEffect(() => {
    if (!projectId || !provincesImageB64 || !provincesImageHash) return

    let cancelled = false
    let settled = false
    const bitmapScope = `bitmap-reconcile:${projectId}`
    const abortController = new AbortController()

    async function reconcileWithBitmap(): Promise<void> {
      setProvinceBitmapStatus('loading')
      notificationService.beginProgress({
        scope: bitmapScope,
        title: tRef.current('notification.bitmapLoad.title'),
        message: tRef.current('notification.bitmapLoad.step.decode'),
        progress: { current: 1, total: BITMAP_RECONCILE_TOTAL_STEPS }
      })

      const cachedFacts = provinceBitmapFactsCache.get(provincesImageHash)
      if (cachedFacts) {
        notificationService.advanceProgress({
          scope: bitmapScope,
          title: tRef.current('notification.bitmapLoad.title'),
          message: tRef.current('notification.bitmapLoad.step.cache'),
          progress: { current: 2, total: BITMAP_RECONCILE_TOTAL_STEPS }
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

      notificationService.advanceProgress({
        scope: bitmapScope,
        title: tRef.current('notification.bitmapLoad.title'),
        message: tRef.current('notification.bitmapLoad.step.analyze'),
        progress: { current: 2, total: BITMAP_RECONCILE_TOTAL_STEPS }
      })
      const bitmapFacts = await runBitmapAnalysis(provincesImageB64, abortController.signal)
      if (cancelled) return
      provinceBitmapFactsCache.set(provincesImageHash, bitmapFacts)

      notificationService.advanceProgress({
        scope: bitmapScope,
        title: tRef.current('notification.bitmapLoad.title'),
        message: tRef.current('notification.bitmapLoad.step.catalog'),
        progress: { current: 3, total: BITMAP_RECONCILE_TOTAL_STEPS }
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
        progress: { current: 4, total: BITMAP_RECONCILE_TOTAL_STEPS }
      })
      notificationService.completeProgress({
        scope: bitmapScope,
        title: tRef.current('notification.bitmapLoad.doneTitle'),
        message: tRef.current('notification.bitmapLoad.doneMessage')
      })
      settled = true
    }

    void reconcileWithBitmap()
      .catch((error) => {
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
      abortController.abort()
      if (!settled) notificationService.dismiss(bitmapScope)
    }
  }, [baseProvinceCatalog, projectId, provincesImageB64, provincesImageHash, setProvinceBitmapStatus, setProvinceCatalog, syncBmpOnlyEntries])
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

const PATCH_RELOAD_TOAST_MS = 3000

function showPatchReloadToast(
  sourcePath: string,
  patchedFiles: Set<string>,
  scope: string,
  title: string
): void {
  const notifAlive = useNotificationStore.getState().notifications.some((n) => n.id === scope)
  if (!notifAlive) patchedFiles.clear()
  const filename = sourcePath.split(/[\\/]/).pop() ?? sourcePath
  patchedFiles.add(filename)
  notificationService.pushAck({
    id: scope,
    scope,
    tone: 'neutral',
    title,
    message: [...patchedFiles].join(', '),
    autoCloseAfterMs: PATCH_RELOAD_TOAST_MS
  })
}
