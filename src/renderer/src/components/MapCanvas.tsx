import { useEffect, useRef, useState, useCallback } from 'react'
import { makeStyles, mergeClasses, tokens, Button, Text, Tooltip } from '@fluentui/react-components'
import { ZoomInRegular, ZoomOutRegular, FullScreenMaximizeRegular, EyedropperRegular, EyedropperFilled } from '@fluentui/react-icons'
import { MapRenderer, type BoundingBox } from '../lib/MapRenderer'

const ZOOM_STEP = 1.25
const ZOOM_MIN = 0.02
const ZOOM_MAX = 32

// Glow pulse: period ~3 s, alpha range 0.35–1.0
const PULSE_SPEED = 0.002
const PULSE_MIN   = 0.35
const PULSE_RANGE = 0.65

interface Transform { x: number; y: number; scale: number }
interface SampledColor { r: number; g: number; b: number }

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
  // mix-blend-mode:difference means drawing white = |255 - background| per channel.
  // pointer-events:none keeps clicks and gl.readPixels on the WebGL canvas unaffected.
  overlay: {
    display: 'block',
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    mixBlendMode: 'difference'
  },
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
  }
})

interface Props {
  src: string | null
  highlightColor: number | null
  onColorPicked?: (r: number, g: number, b: number) => void
}

export function MapCanvas({ src, highlightColor, onColorPicked }: Props): JSX.Element {
  const styles = useStyles()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const overlayRef   = useRef<HTMLCanvasElement>(null)
  const rendererRef  = useRef<MapRenderer | null>(null)
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 })
  const bboxRef      = useRef<BoundingBox | null>(null)
  const alphaRef     = useRef(1)
  const animFrameRef = useRef<number | null>(null)
  const dragRef      = useRef<{ startX: number; startY: number; startTX: number; startTY: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [displayScale, setDisplayScale] = useState(1)
  const [eyedropperActive, setEyedropperActive] = useState(false)
  const [sampledColor, setSampledColor] = useState<SampledColor | null>(null)

  // Draws the overlay at whatever alphaRef.current is.
  // Called both from the RAF animation loop and imperatively on transform/resize.
  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const bbox = bboxRef.current
    if (!bbox) return

    const { x: tx, y: ty, scale } = transformRef.current
    const rx = tx + bbox.x1 * scale
    const ry = ty + bbox.y1 * scale
    const rw = (bbox.x2 - bbox.x1) * scale
    const rh = (bbox.y2 - bbox.y1) * scale
    const a  = alphaRef.current

    ctx.strokeStyle = '#ffffff'
    // Three concentric strokes: wide+faint outer glow → medium → sharp core.
    ctx.globalAlpha = a * 0.15; ctx.lineWidth = 8; ctx.strokeRect(rx, ry, rw, rh)
    ctx.globalAlpha = a * 0.40; ctx.lineWidth = 3; ctx.strokeRect(rx, ry, rw, rh)
    ctx.globalAlpha = a;        ctx.lineWidth = 1.5; ctx.strokeRect(rx, ry, rw, rh)
    ctx.globalAlpha = 1
  }, [])

  const applyTransform = useCallback((next: Transform) => {
    transformRef.current = next
    setDisplayScale(next.scale)
    rendererRef.current?.render(next.x, next.y, next.scale)
    drawOverlay()
  }, [drawOverlay])

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
    const overlay   = overlayRef.current!
    const container = containerRef.current!
    canvas.width = overlay.width = container.clientWidth
    canvas.height = overlay.height = container.clientHeight
    rendererRef.current = new MapRenderer(canvas)
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!src) { rendererRef.current?.clearImage(); return }
    let cancelled = false
    rendererRef.current?.loadImage(src).then(() => { if (!cancelled) fit() })
    return () => { cancelled = true }
  }, [src, fit])

  // Compute bbox and manage the pulse animation loop.
  useEffect(() => {
    bboxRef.current = highlightColor !== null
      ? (rendererRef.current?.computeBoundingBox(highlightColor) ?? null)
      : null

    // Always cancel the previous loop before deciding whether to start a new one.
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }

    if (!bboxRef.current) {
      alphaRef.current = 1
      drawOverlay()   // clears the overlay
      return
    }

    const loop = (time: number) => {
      alphaRef.current = PULSE_MIN + PULSE_RANGE * (Math.sin(time * PULSE_SPEED) * 0.5 + 0.5)
      drawOverlay()
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }
  }, [highlightColor, drawOverlay])

  useEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    const overlay   = overlayRef.current
    if (!container || !canvas || !overlay) return
    const observer = new ResizeObserver(() => {
      canvas.width = overlay.width = container.clientWidth
      canvas.height = overlay.height = container.clientHeight
      const t = transformRef.current
      rendererRef.current?.render(t.x, t.y, t.scale)
      drawOverlay()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [drawOverlay])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
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
      const rect  = canvas.getBoundingClientRect()
      const color = rendererRef.current?.readPixel(e.clientX - rect.left, e.clientY - rect.top)
      setSampledColor(color ?? null)
      if (color) onColorPicked?.(color.r, color.g, color.b)
      return
    }
    const t = transformRef.current
    dragRef.current = { startX: e.clientX, startY: e.clientY, startTX: t.x, startTY: t.y }
    setDragging(true)
  }, [eyedropperActive, onColorPicked])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return
    applyTransform({
      ...transformRef.current,
      x: dragRef.current.startTX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.startTY + (e.clientY - dragRef.current.startY)
    })
  }, [applyTransform])

  const stopDrag = useCallback(() => {
    dragRef.current = null
    setDragging(false)
  }, [])

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
      onMouseLeave={stopDrag}
    >
      <canvas ref={canvasRef}  className={styles.canvas}  />
      <canvas ref={overlayRef} className={styles.overlay} />
      <div className={styles.controls}>
        <div className={styles.widget}>
          <Tooltip content="Pick color" relationship="label">
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
            </>
          ) : (
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>—</Text>
          )}
        </div>
        <div className={styles.widget}>
          <Button appearance="subtle" size="small" icon={<ZoomOutRegular />} onClick={() => zoomBy(1 / ZOOM_STEP)} />
          <Text size={200} className={styles.zoomLabel}>{Math.round(displayScale * 100)}%</Text>
          <Button appearance="subtle" size="small" icon={<ZoomInRegular />} onClick={() => zoomBy(ZOOM_STEP)} />
          <Button appearance="subtle" size="small" icon={<FullScreenMaximizeRegular />} onClick={fit} title="Fit to view" />
        </div>
      </div>
    </div>
  )
}
