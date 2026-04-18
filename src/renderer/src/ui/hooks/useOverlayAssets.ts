import { useEffect, useMemo, useRef, useState } from 'react'
import type { OverlayId, MapOverlayState, OverlayFilterRule } from '../../core/contracts/MapOverlay'
import type { ResolvedPaths } from '../../../../shared/pathTypes'
import type { MessageKey } from '../i18n/messages/en'
import type { CanvasOverlay } from '../contracts/CanvasOverlay'
import type { OverlayConfiguration } from '../contracts/OverlayConfiguration'
import { OVERLAY_META } from '../config/overlays'

export interface OverlayPanelItem {
  id: OverlayId
  labelKey: MessageKey
  configPath: string
  resolvedPath: string | null
  fileStateLabelKey: MessageKey
  visible: boolean
  opacity: number
  configuration: OverlayConfiguration
  filterRules: OverlayFilterRule[]
}

interface OverlayAssetEntry {
  id: OverlayId
  path: string
  hash: string
  objectUrl: string
  externallyModified: boolean
}

interface OverlayAssetRecord {
  path: string | null
  fileStateLabelKey: MessageKey
  objectUrl: string | null
}

const INITIAL_OVERLAY_ASSETS: Record<OverlayId, OverlayAssetRecord> = {
  rivers: {
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
  const cacheRef = useRef(new Map<OverlayId, OverlayAssetEntry>())
  const [assetStateVersion, setAssetStateVersion] = useState(0)

  useEffect(() => {
    if (!resolvedPaths) return

    const unsubscribe = window.api.files.onChanged((event) => {
      for (const entry of cacheRef.current.values()) {
        if (entry.path !== event.path) continue
        entry.externallyModified = entry.hash !== event.hash
        setAssetStateVersion((version) => version + 1)
      }
    })

    return () => {
      unsubscribe()

      for (const entry of cacheRef.current.values()) {
        URL.revokeObjectURL(entry.objectUrl)
        void window.api.files.unload(entry.path)
      }
      cacheRef.current.clear()
    }
  }, [resolvedPaths])

  useEffect(() => {
    if (!resolvedPaths) return

    let cancelled = false

    async function ensureVisibleOverlaysLoaded() {
      for (const overlay of overlays) {
        if (!overlay.visible) continue
        const resolvedPath = resolveOverlayPath(overlay.id, resolvedPaths)
        if (!resolvedPath) continue

        const existing = cacheRef.current.get(overlay.id)
        if (existing && existing.path === resolvedPath) continue

        const result = await window.api.files.load(resolvedPath)
        if (cancelled) {
          await window.api.files.unload(result.path)
          continue
        }

        const previous = cacheRef.current.get(overlay.id)
        if (previous && previous.path !== result.path) {
          URL.revokeObjectURL(previous.objectUrl)
          await window.api.files.unload(previous.path)
        }

        cacheRef.current.set(overlay.id, {
          id: overlay.id,
          path: result.path,
          hash: result.hash,
          objectUrl: createBmpObjectUrl(result.content),
          externallyModified: false
        })
        setAssetStateVersion((version) => version + 1)
      }
    }

    void ensureVisibleOverlaysLoaded()

    return () => {
      cancelled = true
    }
  }, [overlays, resolvedPaths])

  return useMemo(() => {
    const assetRecords = buildAssetRecords(cacheRef.current, resolvedPaths)

    return {
      panelOverlays: overlays.map((overlay) => {
        const meta = OVERLAY_META[overlay.id]
        const asset = assetRecords[overlay.id]
        return {
          id: overlay.id,
          labelKey: meta.labelKey,
          configPath: meta.configPath,
          resolvedPath: asset.path,
          fileStateLabelKey: asset.fileStateLabelKey,
          visible: overlay.visible,
          opacity: overlay.opacity,
          configuration: meta.configuration,
          filterRules: overlay.filterRules
        }
      }),
      canvasOverlays: overlays.flatMap((overlay) => {
        const asset = assetRecords[overlay.id]
        if (!asset.objectUrl) return []
        return [{
          id: overlay.id,
          src: asset.objectUrl,
          visible: overlay.visible,
          opacity: overlay.opacity / 100,
          configuration: OVERLAY_META[overlay.id].configuration,
          filterRules: overlay.filterRules
        }]
      })
    }
  }, [assetStateVersion, overlays, resolvedPaths])
}

function buildAssetRecords(
  cache: Map<OverlayId, OverlayAssetEntry>,
  resolvedPaths: ResolvedPaths | null
): Record<OverlayId, OverlayAssetRecord> {
  return {
    rivers: buildAssetRecord('rivers', cache, resolvedPaths)
  }
}

function buildAssetRecord(
  overlayId: OverlayId,
  cache: Map<OverlayId, OverlayAssetEntry>,
  resolvedPaths: ResolvedPaths | null
): OverlayAssetRecord {
  const cached = cache.get(overlayId)
  if (cached) {
    return {
      path: cached.path,
      fileStateLabelKey: cached.externallyModified ? 'overlay.fileState.modified' : 'overlay.fileState.loaded',
      objectUrl: cached.objectUrl
    }
  }

  return {
    ...INITIAL_OVERLAY_ASSETS[overlayId],
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
