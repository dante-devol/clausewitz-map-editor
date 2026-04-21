import { useCallback, useEffect, useRef, useState } from 'react'
import { MapRenderer } from '../../infra/lib/MapRenderer'
import { BmpProvinceMapSource } from '../../infra/lib/BmpProvinceMapSource'
import type { CanvasOverlay, BitmapCanvasOverlay } from '../contracts/CanvasOverlay'
import type { OverlayFilterRule } from '../../core/contracts/MapOverlay'
import type { ProvinceIndex } from '../../infra/lib/provinceAnalysis'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HoveredColor { r: number; g: number; b: number; x: number; y: number }

interface Transform { x: number; y: number; scale: number }
interface OverlayBitmapEntry {
  src: string
  bitmap: ImageBitmap
  pixelData: Uint8ClampedArray
  width: number
  height: number
  filteredCanvas: OffscreenCanvas | null
  filteredSignature: string | null
}
interface ProvinceBboxGroup { minX: number; minY: number; maxX: number; maxY: number }
interface ScreenRect { left: number; top: number; right: number; bottom: number }

const ZOOM_STEP = 1.25
const ZOOM_MIN = 0.02
const ZOOM_MAX = 32
const BBOX_MERGE_PADDING_PX = 1

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseMapCanvasProps {
  src: string | null
  overlays: CanvasOverlay[]
  highlightColors: number[]
  validationWarningColors: number[]
  validationErrorColors: number[]
  colorMap?: Map<number, number> | null
  activeTool: 'select' | 'eyedrop' | 'bucket'
  onMapClick?: (r: number, g: number, b: number, additive: boolean) => void
  onHoverColorChange?: (color: HoveredColor | null) => void
}

export interface UseMapCanvasResult {
  containerRef: React.RefObject<HTMLDivElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  dragging: boolean
  displayScale: number
  imageLoaded: boolean
  isCanvasLoading: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onMouseMove: (e: React.MouseEvent) => void
  stopDrag: () => void
  zoomBy: (factor: number) => void
  fit: () => void
}

export function useMapCanvas({
  src,
  overlays,
  highlightColors,
  validationWarningColors,
  validationErrorColors,
  colorMap,
  activeTool,
  onMapClick,
  onHoverColorChange,
}: UseMapCanvasProps): UseMapCanvasResult {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rendererRef  = useRef<MapRenderer | null>(null)
  const provinceIndexRef = useRef<ProvinceIndex | null>(null)
  const canvasOverlaysRef = useRef<CanvasOverlay[]>([])
  const overlayBitmapsRef = useRef(new Map<string, OverlayBitmapEntry>())
  const transformRef      = useRef<Transform>({ x: 0, y: 0, scale: 1 })
  const highlightColorsRef = useRef<number[]>([])
  const validationWarningColorsRef = useRef<number[]>([])
  const validationErrorColorsRef = useRef<number[]>([])
  const colorMapRef  = useRef<Map<number, number> | null | undefined>(null)
  const cancelPanRef = useRef<(() => void) | null>(null)
  const dragRef      = useRef<{ startX: number; startY: number; startTX: number; startTY: number } | null>(null)

  const [dragging, setDragging] = useState(false)
  const [displayScale, setDisplayScale] = useState(1)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [baseImageLoading, setBaseImageLoading] = useState(false)
  const [overlaysLoadingCount, setOverlaysLoadingCount] = useState(0)

  const isCanvasLoading = baseImageLoading || overlaysLoadingCount > 0

  const syncOverlaysToRenderer = useCallback(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    const bitmapEntries: { id: string; source: ImageBitmap | OffscreenCanvas; opacity: number }[] = []
    const outlineEntries: { id: string; source: ImageBitmap | OffscreenCanvas; opacity: number; color: [number, number, number, number] }[] = []
    for (const overlay of canvasOverlaysRef.current) {
      if (!overlay.visible) continue
      if (overlay.kind === 'bitmap') {
        const entry = overlayBitmapsRef.current.get(overlay.id)
        if (!entry) continue
        bitmapEntries.push({ id: overlay.id, source: getOverlayRenderSource(entry, overlay), opacity: overlay.opacity })
        continue
      }
      outlineEntries.push({ id: overlay.id, source: overlay.source, opacity: overlay.opacity, color: hexToRgba(overlay.lineColor) })
    }
    renderer.setOverlayTextures({ bitmapEntries, outlineEntries })
  }, [])

  const applyTransform = useCallback((next: Transform) => {
    transformRef.current = next
    setDisplayScale(next.scale)
    rendererRef.current?.render(next.x, next.y, next.scale)
  }, [])

  const fit = useCallback(() => {
    const renderer = rendererRef.current
    const canvas = canvasRef.current
    if (!renderer || !canvas || renderer.imageSize.width === 0) return
    const { width: iw, height: ih } = renderer.imageSize
    const scale = Math.min(canvas.width / iw, canvas.height / ih)
    syncSelectionStructure(renderer, provinceIndexRef.current, highlightColorsRef.current, scale)
    syncValidationStructure(renderer, provinceIndexRef.current, validationWarningColorsRef.current, validationErrorColorsRef.current, scale)
    applyTransform({ scale, x: (canvas.width - iw * scale) / 2, y: (canvas.height - ih * scale) / 2 })
  }, [applyTransform])

  // Create renderer on mount; dispose on unmount
  useEffect(() => {
    const canvas    = canvasRef.current!
    const container = containerRef.current!
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    rendererRef.current = new MapRenderer(canvas)
    return () => {
      cancelPanRef.current?.()
      for (const entry of overlayBitmapsRef.current.values()) entry.bitmap.close()
      overlayBitmapsRef.current.clear()
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [])

  // Load base image
  useEffect(() => {
    if (!src) {
      rendererRef.current?.clearImage()
      setImageLoaded(false)
      setBaseImageLoading(false)
      return
    }
    setImageLoaded(false)
    setBaseImageLoading(true)
    let cancelled = false
    BmpProvinceMapSource.load(src).then(async (source) => {
      if (cancelled) { source.dispose(); return }
      await rendererRef.current?.loadImage(source)
      provinceIndexRef.current = rendererRef.current?.index ?? null
      source.dispose()
      if (cancelled) return
      const cm = colorMapRef.current
      if (cm && cm.size > 0) rendererRef.current?.recolorTexture(cm)
      rendererRef.current?.setHighlightColors(highlightColorsRef.current)
      rendererRef.current?.setValidationHighlightColors({ warningColors: validationWarningColorsRef.current, errorColors: validationErrorColorsRef.current })
      syncSelectionStructure(rendererRef.current, provinceIndexRef.current, highlightColorsRef.current, transformRef.current.scale)
      syncValidationStructure(rendererRef.current, provinceIndexRef.current, validationWarningColorsRef.current, validationErrorColorsRef.current, transformRef.current.scale)
      fit()
      setImageLoaded(true)
      setBaseImageLoading(false)
    }).catch(() => { if (cancelled) return; setBaseImageLoading(false) })
    return () => {
      cancelled = true
      setBaseImageLoading(false)
      provinceIndexRef.current = null
    }
  }, [src, fit])

  // Sync color map
  useEffect(() => {
    colorMapRef.current = colorMap ?? null
    const renderer = rendererRef.current
    if (!renderer) return
    if (colorMap && colorMap.size > 0) renderer.recolorTexture(colorMap)
    else renderer.restoreOriginalTexture()
    const t = transformRef.current
    renderer.render(t.x, t.y, t.scale)
  }, [colorMap])

  // Load / sync overlays
  useEffect(() => {
    canvasOverlaysRef.current = overlays
    let cancelled = false

    for (const [id, entry] of overlayBitmapsRef.current.entries()) {
      const overlay = overlays.find((candidate) => candidate.id === id)
      if (!overlay || overlay.kind !== 'bitmap' || overlay.src !== entry.src) {
        entry.bitmap.close()
        overlayBitmapsRef.current.delete(id)
      }
    }

    async function loadOverlays() {
      const pendingOverlays = overlays.filter((overlay): overlay is Extract<CanvasOverlay, { kind: 'bitmap' }> => {
        if (overlay.kind !== 'bitmap') return false
        const existing = overlayBitmapsRef.current.get(overlay.id)
        return !existing || existing.src !== overlay.src
      })
      setOverlaysLoadingCount(pendingOverlays.length)

      const pending = await Promise.all(
        pendingOverlays.map(async (overlay) => {
          const existing = overlayBitmapsRef.current.get(overlay.id)
          if (existing && existing.src === overlay.src) return null
          const blob = await fetch(overlay.src).then((r) => r.blob())
          const bitmap = await createImageBitmap(blob)
          const image = await readBitmapPixels(bitmap)
          return { overlay, image }
        })
      )

      if (cancelled) {
        for (const result of pending) result?.image.bitmap.close()
        setOverlaysLoadingCount(0)
        return
      }

      for (const result of pending) {
        if (!result) continue
        const previous = overlayBitmapsRef.current.get(result.overlay.id)
        if (previous) previous.bitmap.close()
        overlayBitmapsRef.current.set(result.overlay.id, {
          src: result.overlay.src,
          bitmap: result.image.bitmap,
          pixelData: result.image.pixelData,
          width: result.image.bitmap.width,
          height: result.image.bitmap.height,
          filteredCanvas: null,
          filteredSignature: null
        })
      }

      setOverlaysLoadingCount(0)
      syncOverlaysToRenderer()
      const { x: tx, y: ty, scale } = transformRef.current
      rendererRef.current?.render(tx, ty, scale)
    }

    void loadOverlays().catch(() => { setOverlaysLoadingCount(0) })

    if (overlays.length === 0 || overlays.every((o) => o.kind === 'outline')) {
      setOverlaysLoadingCount(0)
      syncOverlaysToRenderer()
      const { x: tx, y: ty, scale } = transformRef.current
      rendererRef.current?.render(tx, ty, scale)
    }

    return () => { cancelled = true; setOverlaysLoadingCount(0) }
  }, [overlays, syncOverlaysToRenderer])

  // Sync highlight colors
  useEffect(() => {
    highlightColorsRef.current = highlightColors
    const renderer = rendererRef.current
    renderer?.setHighlightColors(highlightColors)
    syncSelectionStructure(renderer, provinceIndexRef.current, highlightColors, transformRef.current.scale)
    const { x: tx, y: ty, scale } = transformRef.current
    renderer?.render(tx, ty, scale)
  }, [highlightColors])

  // Sync validation colors
  useEffect(() => {
    validationWarningColorsRef.current = validationWarningColors
    validationErrorColorsRef.current = validationErrorColors
    const renderer = rendererRef.current
    renderer?.setValidationHighlightColors({ warningColors: validationWarningColors, errorColors: validationErrorColors })
    syncValidationStructure(renderer, provinceIndexRef.current, validationWarningColors, validationErrorColors, transformRef.current.scale)
    const { x: tx, y: ty, scale } = transformRef.current
    renderer?.render(tx, ty, scale)
  }, [validationErrorColors, validationWarningColors])

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return
    const observer = new ResizeObserver(() => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      const t = transformRef.current
      syncSelectionStructure(rendererRef.current, provinceIndexRef.current, highlightColorsRef.current, t.scale)
      syncValidationStructure(rendererRef.current, provinceIndexRef.current, validationWarningColorsRef.current, validationErrorColorsRef.current, t.scale)
      rendererRef.current?.render(t.x, t.y, t.scale)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      cancelPanRef.current?.()
      cancelPanRef.current = null
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const rect   = canvas.getBoundingClientRect()
      const mx     = e.clientX - rect.left
      const my     = e.clientY - rect.top
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
      const prev   = transformRef.current
      const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev.scale * factor))
      const ratio  = newScale / prev.scale
      syncSelectionStructure(rendererRef.current, provinceIndexRef.current, highlightColorsRef.current, newScale)
      syncValidationStructure(rendererRef.current, provinceIndexRef.current, validationWarningColorsRef.current, validationErrorColorsRef.current, newScale)
      applyTransform({ scale: newScale, x: mx - (mx - prev.x) * ratio, y: my - (my - prev.y) * ratio })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [applyTransform])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    cancelPanRef.current?.()
    cancelPanRef.current = null
    if (e.button === 1) {
      e.preventDefault()
      const t = transformRef.current
      dragRef.current = { startX: e.clientX, startY: e.clientY, startTX: t.x, startTY: t.y }
      setDragging(true)
      return
    }
    if (e.button !== 0) return
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const { x: tx, y: ty, scale } = transformRef.current
      const color = rendererRef.current?.readOriginalPixel(cx, cy, tx, ty, scale)
      if (color) onMapClick?.(color.r, color.g, color.b, activeTool === 'select' && e.shiftKey)
      if (activeTool !== 'select') return
    }
    const t = transformRef.current
    dragRef.current = { startX: e.clientX, startY: e.clientY, startTX: t.x, startTY: t.y }
    setDragging(true)
  }, [activeTool, onMapClick])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (canvas && !dragRef.current) {
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const { x: tx, y: ty, scale } = transformRef.current
      const color = rendererRef.current?.readOriginalPixel(cx, cy, tx, ty, scale)
      onHoverColorChange?.(color ? { ...color, x: cx, y: cy } : null)
    } else if (dragRef.current) {
      onHoverColorChange?.(null)
    }
    if (!dragRef.current) return
    applyTransform({
      ...transformRef.current,
      x: dragRef.current.startTX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.startTY + (e.clientY - dragRef.current.startY)
    })
  }, [applyTransform, onHoverColorChange])

  const stopDrag = useCallback(() => { dragRef.current = null; setDragging(false) }, [])

  const zoomBy = useCallback((factor: number) => {
    const canvas = canvasRef.current
    const prev   = transformRef.current
    const cx = canvas ? canvas.width  / 2 : 0
    const cy = canvas ? canvas.height / 2 : 0
    const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev.scale * factor))
    const ratio = newScale / prev.scale
    syncSelectionStructure(rendererRef.current, provinceIndexRef.current, highlightColorsRef.current, newScale)
    syncValidationStructure(rendererRef.current, provinceIndexRef.current, validationWarningColorsRef.current, validationErrorColorsRef.current, newScale)
    applyTransform({ scale: newScale, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio })
  }, [applyTransform])

  return { containerRef, canvasRef, dragging, displayScale, imageLoaded, isCanvasLoading, onMouseDown, onMouseMove, stopDrag, zoomBy, fit }
}

// ─── Canvas utilities (no React deps) ────────────────────────────────────────

function getOverlayRenderSource(entry: OverlayBitmapEntry, overlay: BitmapCanvasOverlay): CanvasImageSource {
  const signature = JSON.stringify({ configuration: overlay.configuration, filterRules: overlay.filterRules })
  if (overlay.filterRules.length === 0) {
    entry.filteredCanvas = null
    entry.filteredSignature = null
    return entry.bitmap
  }
  if (entry.filteredSignature === signature && entry.filteredCanvas) return entry.filteredCanvas
  const canvas = new OffscreenCanvas(entry.width, entry.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return entry.bitmap
  const imageData = new ImageData(new Uint8ClampedArray(entry.pixelData), entry.width, entry.height)
  applyOverlayFilterRules(imageData.data, overlay.filterRules, overlay.configuration.groups)
  ctx.putImageData(imageData, 0, 0)
  entry.filteredCanvas = canvas
  entry.filteredSignature = signature
  return canvas
}

function applyOverlayFilterRules(
  pixels: Uint8ClampedArray,
  rules: OverlayFilterRule[],
  groups: BitmapCanvasOverlay['configuration']['groups']
): void {
  if (rules.length === 0) return
  const groupColors = new Map(groups.map((group) => [
    group.id,
    new Set(group.colors.map((color) => hexToPackedColor(color)))
  ]))
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) continue
    const packed = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2]
    let alphaMultiplier = 1
    let visible = true
    let overrideColor: number | null = null
    for (const rule of rules) {
      if (!matchesOverlayRule(rule, packed, groupColors)) continue
      if (!rule.visible) { visible = false; break }
      alphaMultiplier *= rule.opacity / 100
      if (rule.color) overrideColor = hexToPackedColor(rule.color)
    }
    if (!visible) { pixels[i + 3] = 0; continue }
    if (overrideColor !== null) {
      pixels[i] = (overrideColor >> 16) & 0xff
      pixels[i + 1] = (overrideColor >> 8) & 0xff
      pixels[i + 2] = overrideColor & 0xff
    }
    pixels[i + 3] = Math.round(pixels[i + 3] * alphaMultiplier)
  }
}

function matchesOverlayRule(rule: OverlayFilterRule, packedColor: number, groupColors: Map<string, Set<number>>): boolean {
  if (rule.target.kind === 'group') return groupColors.get(rule.target.groupId)?.has(packedColor) ?? false
  return rule.target.colors.some((color) => hexToPackedColor(color) === packedColor)
}

async function readBitmapPixels(bitmap: ImageBitmap): Promise<{ bitmap: ImageBitmap; pixelData: Uint8ClampedArray }> {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return { bitmap, pixelData: new Uint8ClampedArray(bitmap.width * bitmap.height * 4) }
  ctx.drawImage(bitmap, 0, 0)
  return { bitmap, pixelData: ctx.getImageData(0, 0, bitmap.width, bitmap.height).data }
}

function hexToPackedColor(hex: string): number {
  return parseInt(hex.trim().replace(/^#/, ''), 16)
}

function hexToRgba(hex: string): [number, number, number, number] {
  const packed = hexToPackedColor(hex)
  return [((packed >> 16) & 0xff) / 255, ((packed >> 8) & 0xff) / 255, (packed & 0xff) / 255, 1]
}

function syncSelectionStructure(renderer: MapRenderer | null, provinceIndex: ProvinceIndex | null, highlightColors: number[], scale: number): void {
  if (!renderer || !provinceIndex) return
  const groups = mergeCollidingBboxGroups(buildHighlightGroups(highlightColors, provinceIndex), scale)
  renderer.setSelectionStructure({ bboxGroups: groups, centroid: computeGroupsCentroid(groups) })
}

function syncValidationStructure(renderer: MapRenderer | null, provinceIndex: ProvinceIndex | null, warningColors: number[], errorColors: number[], scale: number): void {
  if (!renderer || !provinceIndex) return
  renderer.setValidationStructure({
    warningBboxGroups: mergeCollidingBboxGroups(buildHighlightGroups(warningColors, provinceIndex), scale),
    errorBboxGroups: mergeCollidingBboxGroups(buildHighlightGroups(errorColors, provinceIndex), scale)
  })
}

function buildHighlightGroups(packedColors: readonly number[], provinceIndex: ProvinceIndex): ProvinceBboxGroup[] {
  const selectedIds = new Set<number>()
  for (const packed of packedColors) {
    const id = provinceIndex.colorToId.get(packed)
    if (id !== undefined) selectedIds.add(id)
  }
  const groups: ProvinceBboxGroup[] = []
  const visited = new Set<number>()
  for (const startId of selectedIds) {
    if (visited.has(startId)) continue
    visited.add(startId)
    const queue: number[] = [startId]
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity
    while (queue.length > 0) {
      const currentId = queue.pop()!
      const bbox = provinceIndex.bboxes.get(currentId)
      if (bbox) {
        if (bbox.minX < minX) minX = bbox.minX
        if (bbox.minY < minY) minY = bbox.minY
        if (bbox.maxX > maxX) maxX = bbox.maxX
        if (bbox.maxY > maxY) maxY = bbox.maxY
      }
      const adjacent = provinceIndex.adjacency.get(currentId)
      if (!adjacent) continue
      for (const neighborId of adjacent) {
        if (!selectedIds.has(neighborId) || visited.has(neighborId)) continue
        visited.add(neighborId)
        queue.push(neighborId)
      }
    }
    if (minX !== Infinity) groups.push({ minX, minY, maxX, maxY })
  }
  return groups
}

function computeGroupsCentroid(groups: readonly ProvinceBboxGroup[]): { x: number; y: number } | null {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity
  for (const group of groups) {
    if (group.minX < minX) minX = group.minX
    if (group.minY < minY) minY = group.minY
    if (group.maxX > maxX) maxX = group.maxX
    if (group.maxY > maxY) maxY = group.maxY
  }
  if (minX === Infinity) return null
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}

function mergeCollidingBboxGroups(groups: readonly ProvinceBboxGroup[], scale: number): ProvinceBboxGroup[] {
  const merged = [...groups]
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const left  = expandedScreenRectForGroup(merged[i], scale, BBOX_MERGE_PADDING_PX)
        const right = expandedScreenRectForGroup(merged[j], scale, BBOX_MERGE_PADDING_PX)
        if (!screenRectsOverlap(left, right)) continue
        merged[i] = unionGroups(merged[i], merged[j])
        merged.splice(j, 1)
        changed = true
        break
      }
      if (changed) break
    }
  }
  return merged
}

function expandedScreenRectForGroup(group: ProvinceBboxGroup, scale: number, paddingPx: number): ScreenRect {
  return {
    left:   group.minX * scale - 1 - paddingPx,
    top:    group.minY * scale - 1 - paddingPx,
    right:  (group.maxX + 1) * scale + 1 + paddingPx,
    bottom: (group.maxY + 1) * scale + 1 + paddingPx
  }
}

function screenRectsOverlap(a: ScreenRect, b: ScreenRect): boolean {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top
}

function unionGroups(a: ProvinceBboxGroup, b: ProvinceBboxGroup): ProvinceBboxGroup {
  return { minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) }
}
