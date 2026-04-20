import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import type { OverlayId, MapOverlayState, BitmapMapOverlayState, OutlineMapOverlayState } from '../../core/contracts/MapOverlay'
import type { ResolvedPaths } from '../../../../shared/pathTypes'
import type { MessageKey } from '../i18n/messages/en'
import type { CanvasOverlay, BitmapCanvasOverlay, OutlineCanvasOverlay } from '../contracts/CanvasOverlay'
import type { OverlayConfiguration, OutlineOverlayConfiguration, OverlayUiConfiguration } from '../contracts/OverlayConfiguration'
import { OVERLAY_META } from '../config/overlays'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { BmpProvinceMapSource } from '../../infra/lib/BmpProvinceMapSource'
import { buildProvinceIndex, type ProvinceIndex } from '../../infra/lib/provinceAnalysis'
import { buildGroupedOutlineGroups, buildProvinceOutlineGroups, type OutlineGroupSource } from '../../infra/lib/overlayOutlineMasks'

export type OverlayPanelItem =
  | {
    id: OverlayId
    kind: 'bitmap'
    labelKey: MessageKey
    configPath: string
    resolvedPath: string | null
    fileStateLabelKey: MessageKey
    visible: boolean
    opacity: number
    configuration: OverlayConfiguration
    filterRules: BitmapMapOverlayState['filterRules']
  }
  | {
    id: OverlayId
    kind: 'outline'
    labelKey: MessageKey
    visible: boolean
    opacity: number
    configuration: OutlineOverlayConfiguration
    lineColor: string
  }

interface BitmapOverlayAssetEntry {
  id: OverlayId
  path: string
  hash: string
  objectUrl: string
  externallyModified: boolean
}

interface OutlineOverlayAssetEntry {
  cacheKey: string
  source: OutlineGroupSource
}

interface ProvinceIndexCacheEntry {
  // The provincesImageB64 string this index was built from.
  // Using the raw base64 (not the hash) so that hash arrival never triggers a rebuild.
  sourceb64: string
  revision: number
  index: ProvinceIndex
  width: number
  height: number
}

interface BitmapOverlayAssetRecord {
  path: string | null
  fileStateLabelKey: MessageKey
  objectUrl: string | null
}

const INITIAL_BITMAP_OVERLAY_ASSETS: Record<OverlayId, BitmapOverlayAssetRecord> = {
  rivers: {
    path: null,
    fileStateLabelKey: 'overlay.fileState.unavailable',
    objectUrl: null
  },
  provinces: {
    path: null,
    fileStateLabelKey: 'overlay.fileState.unavailable',
    objectUrl: null
  },
  states: {
    path: null,
    fileStateLabelKey: 'overlay.fileState.unavailable',
    objectUrl: null
  },
  strategicRegions: {
    path: null,
    fileStateLabelKey: 'overlay.fileState.unavailable',
    objectUrl: null
  }
}

export function useOverlayAssets(
  overlays: MapOverlayState[],
  resolvedPaths: ResolvedPaths | null
): {
  panelOverlays: OverlayPanelItem[]
  canvasOverlays: CanvasOverlay[]
} {
  const provincesImageB64 = useMapDataStore((s) => s.provincesImageB64)
  const provincesByColor = useMapDataStore((s) => s.provincesByColor)
  const stateProvinceToStateId = useMapDataStore((s) => s.stateProvinceToStateId)
  const strategicRegionProvinceToRegionId = useMapDataStore((s) => s.strategicRegionProvinceToRegionId)
  const statesStatus = useMapDataStore((s) => s.statesStatus)
  const strategicRegionsStatus = useMapDataStore((s) => s.strategicRegionsStatus)
  const statesRevision = useMapDataStore((s) => s.statesRevision)
  const strategicRegionsRevision = useMapDataStore((s) => s.strategicRegionsRevision)

  const bitmapCacheRef = useRef(new Map<OverlayId, BitmapOverlayAssetEntry>())
  const outlineCacheRef = useRef(new Map<OverlayId, OutlineOverlayAssetEntry>())
  const provinceIndexRef = useRef<ProvinceIndexCacheEntry | null>(null)
  const provinceIndexRevisionRef = useRef(0)
  const [assetStateVersion, setAssetStateVersion] = useState(0)

  useEffect(() => {
    if (!resolvedPaths) return

    const unsubscribe = window.api.files.onChanged((event) => {
      for (const entry of bitmapCacheRef.current.values()) {
        if (entry.path !== event.path) continue
        entry.externallyModified = entry.hash !== event.hash
        setAssetStateVersion((version) => version + 1)
      }
    })

    return () => {
      unsubscribe()

      for (const entry of bitmapCacheRef.current.values()) {
        URL.revokeObjectURL(entry.objectUrl)
        void window.api.files.unload(entry.path)
      }
      bitmapCacheRef.current.clear()
      outlineCacheRef.current.clear()
      provinceIndexRef.current = null
    }
  }, [resolvedPaths])

  useEffect(() => {
    if (!resolvedPaths) return

    let cancelled = false

    async function ensureVisibleOverlaysLoaded() {
      // Evict cached canvases for hidden overlays so their OffscreenCanvas backing
      // stores can be GC'd.  Outline canvases are large (full map × 4 bytes each)
      // and holding multiple simultaneously causes significant memory pressure.
      for (const overlay of overlays) {
        if (!overlay.visible && overlay.kind === 'outline') {
          outlineCacheRef.current.delete(overlay.id)
        }
      }

      for (const overlay of overlays) {
        if (!overlay.visible) continue

        if (overlay.kind === 'bitmap') {
          const resolvedPath = resolveOverlayPath(overlay.id, resolvedPaths)
          if (!resolvedPath) continue

          const existing = bitmapCacheRef.current.get(overlay.id)
          if (existing && existing.path === resolvedPath) continue

          const result = await window.api.files.load(resolvedPath)
          if (cancelled) {
            await window.api.files.unload(result.path)
            continue
          }

          const previous = bitmapCacheRef.current.get(overlay.id)
          if (previous && previous.path !== result.path) {
            URL.revokeObjectURL(previous.objectUrl)
            await window.api.files.unload(previous.path)
          }

          bitmapCacheRef.current.set(overlay.id, {
            id: overlay.id,
            path: result.path,
            hash: result.hash,
            objectUrl: createBmpObjectUrl(result.content),
            externallyModified: false
          })
          setAssetStateVersion((version) => version + 1)
          continue
        }

        const outlineAsset = await ensureOutlineOverlayLoaded(
          overlay,
          provincesImageB64,
          provinceIndexRef,
          provinceIndexRevisionRef,
          outlineCacheRef,
          provincesByColor,
          stateProvinceToStateId,
          strategicRegionProvinceToRegionId,
          statesStatus,
          strategicRegionsStatus,
          statesRevision,
          strategicRegionsRevision
        )
        if (cancelled || !outlineAsset) continue
        setAssetStateVersion((version) => version + 1)
      }
    }

    void ensureVisibleOverlaysLoaded()

    return () => {
      cancelled = true
    }
  }, [
    overlays,
    provincesImageB64,
    provincesByColor,
    resolvedPaths,
    stateProvinceToStateId,
    statesRevision,
    statesStatus,
    strategicRegionProvinceToRegionId,
    strategicRegionsRevision,
    strategicRegionsStatus
  ])

  return useMemo(() => {
    const bitmapAssetRecords = buildBitmapAssetRecords(bitmapCacheRef.current, resolvedPaths)

    return {
      panelOverlays: overlays.map((overlay) => buildPanelOverlayItem(overlay, bitmapAssetRecords)),
      canvasOverlays: overlays.flatMap<CanvasOverlay>((overlay) => {
        if (!overlay.visible) return []
        if (overlay.kind === 'bitmap') {
          const asset = bitmapAssetRecords[overlay.id]
          if (!asset.objectUrl) return []
          return [{
            id: overlay.id,
            kind: 'bitmap',
            src: asset.objectUrl,
            visible: overlay.visible,
            opacity: overlay.opacity / 100,
            configuration: OVERLAY_META[overlay.id].configuration as OverlayConfiguration,
            filterRules: overlay.filterRules
          } satisfies BitmapCanvasOverlay]
        }

        const asset = outlineCacheRef.current.get(overlay.id)
        if (!asset) return []
        return [{
          id: overlay.id,
          kind: 'outline',
          visible: overlay.visible,
          opacity: overlay.opacity / 100,
          lineColor: overlay.lineColor,
          source: asset.source.canvas
        } satisfies OutlineCanvasOverlay]
      })
    }
  }, [assetStateVersion, overlays, resolvedPaths])
}

function buildPanelOverlayItem(
  overlay: MapOverlayState,
  bitmapAssetRecords: Record<OverlayId, BitmapOverlayAssetRecord>
): OverlayPanelItem {
  const meta = OVERLAY_META[overlay.id]
  if (overlay.kind === 'bitmap') {
    const asset = bitmapAssetRecords[overlay.id]
    return {
      id: overlay.id,
      kind: 'bitmap',
      labelKey: meta.labelKey,
      configPath: meta.configPath ?? '',
      resolvedPath: asset.path,
      fileStateLabelKey: asset.fileStateLabelKey,
      visible: overlay.visible,
      opacity: overlay.opacity,
      configuration: meta.configuration as OverlayConfiguration,
      filterRules: overlay.filterRules
    }
  }

  return {
    id: overlay.id,
    kind: 'outline',
    labelKey: meta.labelKey,
    visible: overlay.visible,
    opacity: overlay.opacity,
    configuration: meta.configuration as OutlineOverlayConfiguration,
    lineColor: overlay.lineColor
  }
}

async function ensureOutlineOverlayLoaded(
  overlay: OutlineMapOverlayState,
  provincesImageB64: string | null,
  provinceIndexRef: MutableRefObject<ProvinceIndexCacheEntry | null>,
  provinceIndexRevisionRef: MutableRefObject<number>,
  outlineCacheRef: MutableRefObject<Map<OverlayId, OutlineOverlayAssetEntry>>,
  provincesByColor: ReadonlyMap<number, number>,
  stateProvinceToStateId: ReadonlyMap<number, number>,
  strategicRegionProvinceToRegionId: ReadonlyMap<number, number>,
  statesStatus: 'idle' | 'loading' | 'ready' | 'error',
  strategicRegionsStatus: 'idle' | 'loading' | 'ready' | 'error',
  statesRevision: number,
  strategicRegionsRevision: number
): Promise<OutlineOverlayAssetEntry | null> {
  if (!provincesImageB64) return null
  if (overlay.id === 'states' && statesStatus !== 'ready') return null
  if (overlay.id === 'strategicRegions' && strategicRegionsStatus !== 'ready') return null

  // Rebuild the province index only when the actual image content changes (provincesImageB64),
  // NOT when just the file hash arrives.  Using the hash as the key caused a full reload +
  // index rebuild every time the async hash resolved, even though the data was identical.
  if (provinceIndexRef.current?.sourceb64 !== provincesImageB64) {
    const source = await BmpProvinceMapSource.load(`data:image/bmp;base64,${provincesImageB64}`)
    try {
      provinceIndexRevisionRef.current++
      provinceIndexRef.current = {
        sourceb64: provincesImageB64,
        revision: provinceIndexRevisionRef.current,
        index: buildProvinceIndex({
          data: source.pixelData,
          width: source.width,
          height: source.height
        }),
        width: source.width,
        height: source.height
      }
      outlineCacheRef.current.clear()
    } finally {
      source.dispose()
    }
  }

  const provinceIndexEntry = provinceIndexRef.current
  if (!provinceIndexEntry) return null

  const cacheKey = getOutlineOverlayCacheKey(
    overlay.id,
    provinceIndexEntry.revision,
    statesRevision,
    strategicRegionsRevision
  )
  const cached = outlineCacheRef.current.get(overlay.id)
  if (cached && cached.cacheKey === cacheKey) return cached

  const source = overlay.id === 'provinces'
    ? buildProvinceOutlineGroups(provinceIndexEntry.index, provinceIndexEntry.width, provinceIndexEntry.height)
    : overlay.id === 'states'
      ? buildGroupedOutlineGroups(
        provinceIndexEntry.index,
        provinceIndexEntry.width,
        provinceIndexEntry.height,
        remapGroupsToBitmapProvinceIds(provinceIndexEntry.index, provincesByColor, stateProvinceToStateId)
      )
      : buildGroupedOutlineGroups(
        provinceIndexEntry.index,
        provinceIndexEntry.width,
        provinceIndexEntry.height,
        remapGroupsToBitmapProvinceIds(provinceIndexEntry.index, provincesByColor, strategicRegionProvinceToRegionId)
      )

  const next = { cacheKey, source }
  outlineCacheRef.current.set(overlay.id, next)
  return next
}

function getOutlineOverlayCacheKey(
  overlayId: OverlayId,
  provinceIndexRevision: number,
  statesRevision: number,
  strategicRegionsRevision: number
): string {
  if (overlayId === 'states') return `${overlayId}:${provinceIndexRevision}:${statesRevision}`
  if (overlayId === 'strategicRegions') return `${overlayId}:${provinceIndexRevision}:${strategicRegionsRevision}`
  return `${overlayId}:${provinceIndexRevision}`
}

function buildBitmapAssetRecords(
  cache: Map<OverlayId, BitmapOverlayAssetEntry>,
  resolvedPaths: ResolvedPaths | null
): Record<OverlayId, BitmapOverlayAssetRecord> {
  return {
    rivers: buildBitmapAssetRecord('rivers', cache, resolvedPaths),
    provinces: INITIAL_BITMAP_OVERLAY_ASSETS.provinces,
    states: INITIAL_BITMAP_OVERLAY_ASSETS.states,
    strategicRegions: INITIAL_BITMAP_OVERLAY_ASSETS.strategicRegions
  }
}

function buildBitmapAssetRecord(
  overlayId: OverlayId,
  cache: Map<OverlayId, BitmapOverlayAssetEntry>,
  resolvedPaths: ResolvedPaths | null
): BitmapOverlayAssetRecord {
  const cached = cache.get(overlayId)
  if (cached) {
    return {
      path: cached.path,
      fileStateLabelKey: cached.externallyModified ? 'overlay.fileState.modified' : 'overlay.fileState.loaded',
      objectUrl: cached.objectUrl
    }
  }

  return {
    ...INITIAL_BITMAP_OVERLAY_ASSETS[overlayId],
    path: resolvedPaths ? resolveOverlayPath(overlayId, resolvedPaths) : null
  }
}

function resolveOverlayPath(overlayId: OverlayId, resolvedPaths: ResolvedPaths): string | null {
  if (overlayId === 'rivers') return resolvedPaths.rivers
  return null
}

function createBmpObjectUrl(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: 'image/bmp' })
  return URL.createObjectURL(blob)
}

function remapGroupsToBitmapProvinceIds(
  provinceIndex: ProvinceIndex,
  provincesByColor: ReadonlyMap<number, number>,
  groupsByProvinceId: ReadonlyMap<number, number>
): Map<number, number> {
  const groupsByBitmapProvinceId = new Map<number, number>()
  for (const [packedColor, bitmapProvinceId] of provinceIndex.colorToId) {
    const provinceId = provincesByColor.get(packedColor)
    if (provinceId === undefined) continue
    const groupId = groupsByProvinceId.get(provinceId)
    if (groupId === undefined) continue
    groupsByBitmapProvinceId.set(bitmapProvinceId, groupId)
  }
  return groupsByBitmapProvinceId
}
