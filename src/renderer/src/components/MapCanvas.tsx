import { useEffect, useRef, useState, useCallback } from 'react'
import { makeStyles, mergeClasses, tokens, Button, Text } from '@fluentui/react-components'
import { ZoomInRegular, ZoomOutRegular, FullScreenMaximizeRegular } from '@fluentui/react-icons'

const ZOOM_STEP = 1.25
const ZOOM_MIN = 0.02
const ZOOM_MAX = 32

interface Transform {
  x: number
  y: number
  scale: number
}

const useStyles = makeStyles({
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    cursor: 'grab'
  },
  dragging: {
    cursor: 'grabbing'
  },
  canvas: {
    display: 'block',
    position: 'absolute',
    inset: 0,
    userSelect: 'none'
  },
  widget: {
    position: 'absolute',
    bottom: tokens.spacingVerticalM,
    right: tokens.spacingHorizontalM,
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
  }
})

interface Props {
  src: string | null
}

export function MapCanvas({ src }: Props): JSX.Element {
  const styles = useStyles()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef<{ startX: number; startY: number; startTX: number; startTY: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [displayScale, setDisplayScale] = useState(1)

  const draw = useCallback((tx: number, ty: number, scale: number) => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = scale < 1
    if (scale < 1) ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, tx, ty, img.naturalWidth * scale, img.naturalHeight * scale)
  }, [])

  const applyTransform = useCallback((next: Transform) => {
    transformRef.current = next
    setDisplayScale(next.scale)
    draw(next.x, next.y, next.scale)
  }, [draw])

  const fit = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || img.naturalWidth === 0) return
    const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight)
    applyTransform({
      scale,
      x: (canvas.width - img.naturalWidth * scale) / 2,
      y: (canvas.height - img.naturalHeight * scale) / 2
    })
  }, [applyTransform])

  // Load image when src changes, then fit.
  useEffect(() => {
    if (!src) {
      imageRef.current = null
      const canvas = canvasRef.current
      if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    const img = new Image()
    img.onload = () => { imageRef.current = img; fit() }
    img.src = src
  }, [src, fit])

  // Resize canvas to container, redraw with current transform.
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const observer = new ResizeObserver(() => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      const t = transformRef.current
      draw(t.x, t.y, t.scale)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [draw])

  // Wheel zoom — must be native listener so we can preventDefault (passive: false).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
      const prev = transformRef.current
      const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev.scale * factor))
      const ratio = newScale / prev.scale
      applyTransform({ scale: newScale, x: mx - (mx - prev.x) * ratio, y: my - (my - prev.y) * ratio })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [applyTransform])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const t = transformRef.current
    dragRef.current = { startX: e.clientX, startY: e.clientY, startTX: t.x, startTY: t.y }
    setDragging(true)
  }, [])

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

  const zoomIn = useCallback(() => {
    const canvas = canvasRef.current
    const prev = transformRef.current
    const cx = canvas ? canvas.width / 2 : 0
    const cy = canvas ? canvas.height / 2 : 0
    const newScale = Math.min(ZOOM_MAX, prev.scale * ZOOM_STEP)
    const ratio = newScale / prev.scale
    applyTransform({ scale: newScale, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio })
  }, [applyTransform])

  const zoomOut = useCallback(() => {
    const canvas = canvasRef.current
    const prev = transformRef.current
    const cx = canvas ? canvas.width / 2 : 0
    const cy = canvas ? canvas.height / 2 : 0
    const newScale = Math.max(ZOOM_MIN, prev.scale / ZOOM_STEP)
    const ratio = newScale / prev.scale
    applyTransform({ scale: newScale, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio })
  }, [applyTransform])

  return (
    <div
      ref={containerRef}
      className={mergeClasses(styles.root, dragging && styles.dragging)}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.widget}>
        <Button appearance="subtle" size="small" icon={<ZoomOutRegular />} onClick={zoomOut} />
        <Text size={200} className={styles.zoomLabel}>{Math.round(displayScale * 100)}%</Text>
        <Button appearance="subtle" size="small" icon={<ZoomInRegular />} onClick={zoomIn} />
        <Button appearance="subtle" size="small" icon={<FullScreenMaximizeRegular />} onClick={fit} title="Fit to view" />
      </div>
    </div>
  )
}
