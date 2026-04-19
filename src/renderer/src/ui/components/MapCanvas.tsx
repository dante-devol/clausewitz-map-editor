import { useEffect, useRef, useState, useCallback } from 'react'
import { animateValue, easeOutCubic, lerpVec2 } from '../lib/animateValue'
import { vec2 } from 'gl-matrix'
import { makeStyles, mergeClasses, tokens, Button, Spinner, Text, Tooltip, Skeleton, SkeletonItem } from '@fluentui/react-components'
import { ZoomInRegular, ZoomOutRegular, FullScreenMaximizeRegular, EyedropperRegular, EyedropperFilled, LocationTargetSquareRegular } from '@fluentui/react-icons'
import { useI18n } from '../i18n/I18nProvider'
import { MapRenderer } from '../../infra/lib/MapRenderer'
import { BmpProvinceMapSource } from '../../infra/lib/BmpProvinceMapSource'
import type { CanvasOverlay } from '../contracts/CanvasOverlay'
import type { OverlayFilterRule } from '../../core/contracts/MapOverlay'

const ZOOM_STEP = 1.25
const ZOOM_MIN = 0.02
const ZOOM_MAX = 32

interface Transform { x: number; y: number; scale: number }
interface SampledColor { r: number; g: number; b: number }
interface HoveredColor extends SampledColor { x: number; y: number }
interface HoverTooltipPosition { x: number; y: number }
interface OverlayBitmapEntry {
  src: string
  bitmap: ImageBitmap
  pixelData: Uint8ClampedArray
  width: number
  height: number
  filteredCanvas: OffscreenCanvas | null
  filteredSignature: string | null
}

function toHex(n: number) { return n.toString(16).padStart(2, '0').toUpperCase() }
function colorToHex({ r, g, b }: SampledColor) { return `#${toHex(r)}${toHex(g)}${toHex(b)}` }

const useStyles = makeStyles({
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    cursor: 'grab'
  },
  dragging: { cursor: 'grabbing' },
  eyedropping: { cursor: 'crosshair' },
  canvas: {
    display: 'block',
    position: 'absolute',
    inset: 0,
    userSelect: 'none'
  },
  skeleton: {
    position: 'absolute',
    inset: 0,
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 2
  },
  loadingSpinnerShell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    boxShadow: tokens.shadow8
  },
  canvasHidden: { visibility: 'hidden' },
  controls: {
    position: 'absolute',
    bottom: tokens.spacingVerticalM,
    right: tokens.spacingHorizontalM,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: tokens.spacingVerticalXS
  },
  widget: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    background: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    boxShadow: tokens.shadow4,
    userSelect: 'none'
  },
  zoomLabel: {
    minWidth: '42px',
    textAlign: 'center'
  },
  colorSwatch: {
    width: '16px',
    height: '16px',
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0
  },
  colorLabel: {
    fontFamily: 'monospace',
    minWidth: '58px'
  },
  hoverTooltip: {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    background: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow8,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    maxWidth: '220px',
    zIndex: 1
  },
  hoverTooltipLabel: {
    color: tokens.colorNeutralForeground2
  },
  hoverTooltipValue: {
    display: 'block',
    fontFamily: 'monospace'
  }
})

interface Props {
  src: string | null
  overlays?: CanvasOverlay[]
  highlightColors: number[]
  colorMap?: Map<number, number> | null
  onColorPicked?: (r: number, g: number, b: number, additive: boolean) => void
  hoverTooltipPosition?: HoverTooltipPosition | null
  hoverTooltip?: { label: string; value: string } | null
  onHoverColorChange?: (color: HoveredColor | null) => void
}

export function MapCanvas({
  src,
  overlays = [],
  highlightColors,
  colorMap,
  onColorPicked,
  hoverTooltipPosition,
  hoverTooltip,
  onHoverColorChange,
}: Props): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rendererRef  = useRef<MapRenderer | null>(null)
  const canvasOverlaysRef = useRef<CanvasOverlay[]>([])
  const overlayBitmapsRef = useRef(new Map<string, OverlayBitmapEntry>())
  const transformRef      = useRef<Transform>({ x: 0, y: 0, scale: 1 })
  const highlightColorsRef = useRef<number[]>([])
  const colorMapRef        = useRef<Map<number, number> | null | undefined>(null)
  const cancelPanRef = useRef<(() => void) | null>(null)
  const dragRef      = useRef<{ startX: number; startY: number; startTX: number; startTY: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [displayScale, setDisplayScale] = useState(1)
  const [eyedropperActive, setEyedropperActive] = useState(false)
  const [sampledColor, setSampledColor] = useState<SampledColor | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [baseImageLoading, setBaseImageLoading] = useState(false)
  const [overlaysLoadingCount, setOverlaysLoadingCount] = useState(0)

  const isCanvasLoading = baseImageLoading || overlaysLoadingCount > 0

  const syncOverlaysToRenderer = useCallback(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    const entries: { id: string; source: ImageBitmap | OffscreenCanvas; opacity: number }[] = []
    for (const overlay of canvasOverlaysRef.current) {
      if (!overlay.visible) continue
      const entry = overlayBitmapsRef.current.get(overlay.id)
      if (!entry) continue
      entries.push({ id: overlay.id, source: getOverlayRenderSource(entry, overlay), opacity: overlay.opacity })
    }
    renderer.setOverlayTextures(entries)
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
    applyTransform({
      scale,
      x: (canvas.width - iw * scale) / 2,
      y: (canvas.height - ih * scale) / 2
    })
  }, [applyTransform])

  // Create renderer on mount; cancel any pending RAF and dispose on unmount.
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
      source.dispose()
      if (cancelled) return
      const cm = colorMapRef.current
      if (cm && cm.size > 0) rendererRef.current?.recolorTexture(cm)
      fit()
      setImageLoaded(true)
      setBaseImageLoading(false)
    })
      .catch(() => {
        if (cancelled) return
        setBaseImageLoading(false)
      })
    return () => {
      cancelled = true
      setBaseImageLoading(false)
    }
  }, [src, fit])

  useEffect(() => {
    colorMapRef.current = colorMap ?? null
    const renderer = rendererRef.current
    if (!renderer) return
    if (colorMap && colorMap.size > 0) {
      renderer.recolorTexture(colorMap)
    } else {
      renderer.restoreOriginalTexture()
    }
    const t = transformRef.current
    renderer.render(t.x, t.y, t.scale)
  }, [colorMap])

  useEffect(() => {
    canvasOverlaysRef.current = overlays

    let cancelled = false

    for (const [id, entry] of overlayBitmapsRef.current.entries()) {
      const overlay = overlays.find((candidate) => candidate.id === id)
      if (!overlay || overlay.src !== entry.src) {
        entry.bitmap.close()
        overlayBitmapsRef.current.delete(id)
      }
    }

    async function loadOverlays() {
      const pendingOverlays = overlays.filter((overlay) => {
        const existing = overlayBitmapsRef.current.get(overlay.id)
        return !existing || existing.src !== overlay.src
      })

      setOverlaysLoadingCount(pendingOverlays.length)

      const pending = await Promise.all(
        pendingOverlays.map(async (overlay) => {
          const existing = overlayBitmapsRef.current.get(overlay.id)
          if (existing && existing.src === overlay.src) return null

          const blob = await fetch(overlay.src).then((response) => response.blob())
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

    void loadOverlays().catch(() => {
      setOverlaysLoadingCount(0)
    })

    if (overlays.length === 0) {
      setOverlaysLoadingCount(0)
      syncOverlaysToRenderer()
      const { x: tx, y: ty, scale } = transformRef.current
      rendererRef.current?.render(tx, ty, scale)
    }

    return () => {
      cancelled = true
      setOverlaysLoadingCount(0)
    }
  }, [overlays, syncOverlaysToRenderer])

  useEffect(() => {
    highlightColorsRef.current = highlightColors
    rendererRef.current?.setHighlightColors(highlightColors)
    const { x: tx, y: ty, scale } = transformRef.current
    rendererRef.current?.render(tx, ty, scale)
  }, [highlightColors])

  useEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return
    const observer = new ResizeObserver(() => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      const t = transformRef.current
      rendererRef.current?.render(t.x, t.y, t.scale)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      cancelPanRef.current?.()
      cancelPanRef.current = null
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const rect  = canvas.getBoundingClientRect()
      const mx    = e.clientX - rect.left
      const my    = e.clientY - rect.top
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
      const prev  = transformRef.current
      const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev.scale * factor))
      const ratio = newScale / prev.scale
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
    if (eyedropperActive) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const { x: tx, y: ty, scale } = transformRef.current
      const color = rendererRef.current?.readOriginalPixel(cx, cy, tx, ty, scale)
      setSampledColor(color ?? null)
      if (color) onColorPicked?.(color.r, color.g, color.b, e.shiftKey)
      return
    }
    const t = transformRef.current
    dragRef.current = { startX: e.clientX, startY: e.clientY, startTX: t.x, startTY: t.y }
    setDragging(true)
  }, [eyedropperActive, onColorPicked])

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

  const stopDrag = useCallback(() => {
    dragRef.current = null
    setDragging(false)
  }, [])

  const centerOnProvince = useCallback(() => {
    const renderer = rendererRef.current
    const canvas   = canvasRef.current
    if (!renderer || !canvas) return
    const centroid = renderer.provinceCentroid
    if (!centroid) return

    const { scale } = transformRef.current
    const from = transformRef.current
    const toX = canvas.width  / 2 - centroid.x * scale
    const toY = canvas.height / 2 - centroid.y * scale

    // Skip animation if already within 1px of target.
    if (Math.abs(from.x - toX) < 1 && Math.abs(from.y - toY) < 1) return

    cancelPanRef.current?.()

    const fromPos = vec2.fromValues(from.x, from.y)
    const toPos   = vec2.fromValues(toX, toY)
    const scratch = vec2.create()

    cancelPanRef.current = animateValue(450, easeOutCubic, (t) => {
      lerpVec2(scratch, fromPos, toPos, t)
      applyTransform({ scale, x: scratch[0], y: scratch[1] })
    })
  }, [applyTransform])

  const zoomBy = useCallback((factor: number) => {
    const canvas = canvasRef.current
    const prev   = transformRef.current
    const cx = canvas ? canvas.width  / 2 : 0
    const cy = canvas ? canvas.height / 2 : 0
    const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev.scale * factor))
    const ratio = newScale / prev.scale
    applyTransform({ scale: newScale, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio })
  }, [applyTransform])

  const rootClass = mergeClasses(
    styles.root,
    eyedropperActive ? styles.eyedropping : (dragging ? styles.dragging : undefined)
  )

  return (
    <div
      ref={containerRef}
      className={rootClass}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={() => {
        stopDrag()
        onHoverColorChange?.(null)
      }}
    >
      <canvas ref={canvasRef}  className={mergeClasses(styles.canvas,  !imageLoaded && styles.canvasHidden)} />
      {!imageLoaded && (
        <div className={styles.skeleton}>
          <Skeleton style={{ width: '100%', height: '100%' }}>
            <SkeletonItem style={{ width: '100%', height: '100%', borderRadius: 0 }} />
          </Skeleton>
        </div>
      )}
      {isCanvasLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinnerShell}>
            <Spinner
              size="medium"
              labelPosition="below"
              aria-label={t('mapCanvas.loading')}
            />
          </div>
        </div>
      )}
      {hoverTooltipPosition && hoverTooltip && !eyedropperActive && !dragging && (
        <div
          className={styles.hoverTooltip}
          style={{
            transform: `translate(${hoverTooltipPosition.x + 14}px, ${hoverTooltipPosition.y + 14}px)`,
          }}
        >
          <Text size={100} className={styles.hoverTooltipLabel}>{hoverTooltip.label}</Text>
          <Text size={200} weight="semibold" className={styles.hoverTooltipValue}>
            {hoverTooltip.value}
          </Text>
        </div>
      )}
      <div className={styles.controls} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.widget}>
          <Tooltip content={t('mapCanvas.pickColor')} relationship="label">
            <Button
              appearance={eyedropperActive ? 'primary' : 'subtle'}
              size="small"
              icon={eyedropperActive ? <EyedropperFilled /> : <EyedropperRegular />}
              onClick={() => setEyedropperActive((v) => !v)}
            />
          </Tooltip>
          {sampledColor ? (
            <>
              <div
                className={styles.colorSwatch}
                style={{ backgroundColor: `rgb(${sampledColor.r},${sampledColor.g},${sampledColor.b})` }}
              />
              <Text size={200} className={styles.colorLabel}>{colorToHex(sampledColor)}</Text>
              <Tooltip content={t('mapCanvas.centerOnProvince')} relationship="label">
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<LocationTargetSquareRegular />}
                  onClick={centerOnProvince}
                />
              </Tooltip>
            </>
          ) : (
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>—</Text>
          )}
        </div>
        <div className={styles.widget}>
          <Button appearance="subtle" size="small" icon={<ZoomOutRegular />} onClick={() => zoomBy(1 / ZOOM_STEP)} />
          <Text size={200} className={styles.zoomLabel}>{Math.round(displayScale * 100)}%</Text>
          <Button appearance="subtle" size="small" icon={<ZoomInRegular />} onClick={() => zoomBy(ZOOM_STEP)} />
          <Button appearance="subtle" size="small" icon={<FullScreenMaximizeRegular />} onClick={fit} title={t('mapCanvas.fitToView')} />
        </div>
      </div>
    </div>
  )
}

function getOverlayRenderSource(entry: OverlayBitmapEntry, overlay: CanvasOverlay): CanvasImageSource {
  const signature = JSON.stringify({
    configuration: overlay.configuration,
    filterRules: overlay.filterRules
  })

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
  groups: CanvasOverlay['configuration']['groups']
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
      if (!rule.visible) {
        visible = false
        break
      }
      alphaMultiplier *= rule.opacity / 100
      if (rule.color) overrideColor = hexToPackedColor(rule.color)
    }

    if (!visible) {
      pixels[i + 3] = 0
      continue
    }

    if (overrideColor !== null) {
      pixels[i] = (overrideColor >> 16) & 0xff
      pixels[i + 1] = (overrideColor >> 8) & 0xff
      pixels[i + 2] = overrideColor & 0xff
    }

    pixels[i + 3] = Math.round(pixels[i + 3] * alphaMultiplier)
  }
}

function matchesOverlayRule(
  rule: OverlayFilterRule,
  packedColor: number,
  groupColors: Map<string, Set<number>>
): boolean {
  if (rule.target.kind === 'group') {
    return groupColors.get(rule.target.groupId)?.has(packedColor) ?? false
  }

  return rule.target.colors.some((color) => hexToPackedColor(color) === packedColor)
}

async function readBitmapPixels(bitmap: ImageBitmap): Promise<{ bitmap: ImageBitmap; pixelData: Uint8ClampedArray }> {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return { bitmap, pixelData: new Uint8ClampedArray(bitmap.width * bitmap.height * 4) }
  ctx.drawImage(bitmap, 0, 0)
  return {
    bitmap,
    pixelData: ctx.getImageData(0, 0, bitmap.width, bitmap.height).data
  }
}

function hexToPackedColor(hex: string): number {
  const normalized = hex.trim().replace(/^#/, '')
  return parseInt(normalized, 16)
}
