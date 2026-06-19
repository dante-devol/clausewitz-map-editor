import { useCallback, useEffect, useRef } from 'react'
import { makeStyles, makeStaticStyles, mergeClasses, tokens, Button, Slider, Spinner, Text, Tooltip, Skeleton, SkeletonItem, ProgressBar, shorthands } from '@fluentui/react-components'
import {
  ZoomInRegular, ZoomOutRegular, FullScreenMaximizeRegular,
  EyedropperRegular, EyedropperFilled, PaintBucketRegular, PaintBucketFilled,
  DismissRegular,
  WandRegular, WandFilled, PenRegular, PenFilled,
  AddRegular, AddCircleRegular,
} from '@fluentui/react-icons'
import { useI18n } from '../i18n/I18nProvider'
import { useMapCanvas } from '../hooks/useMapCanvas'
import { useOverlayAssets } from '../hooks/useOverlayAssets'
import { useMapViewportState } from '../hooks/useMapViewportState'
import { DisplayModeControl } from './DisplayModeControl'
import { useNotificationStore } from '../../infra/store/notificationStore'
import { notificationService } from '../../infra/services/notificationService'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { useMapQueryApi } from '../../bridge/MapQueryProvider'
import { unpackColor } from '../../../../shared/mapDataTypes'
import type { BmpPixelStrokeDelta } from '../../../../shared/provinceEditing'

const ZOOM_STEP = 1.25
const NOTIFICATION_FADE_OUT_MS = 250

const FADE_OUT_NAME = 'hoi4me-notification-fade-out'

const useStaticStyles = makeStaticStyles({
  [`@keyframes ${FADE_OUT_NAME}`]: {
    from: { opacity: '1', transform: 'translateY(0)' },
    to: { opacity: '0', transform: 'translateY(-6px)' }
  }
})

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
    gap: tokens.spacingVerticalXS,
    zIndex: 4,
  },
  topLeftNotifications: {
    position: 'absolute',
    top: tokens.spacingVerticalM,
    left: tokens.spacingHorizontalM,
    zIndex: 3
  },
  notificationTray: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: tokens.spacingVerticalXS
  },
  notificationCard: {
    minWidth: '260px',
    maxWidth: '320px',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow8,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1
  },
  notificationHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS
  },
  notificationTitle: {
    display: 'block'
  },
  notificationMessage: {
    display: 'block',
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXXS
  },
  notificationProgress: {
    marginTop: tokens.spacingVerticalXS
  },
  notificationCardSuccess: {
    ...shorthands.borderColor(tokens.colorPaletteGreenBorder2)
  },
  notificationCardWarning: {
    ...shorthands.borderColor(tokens.colorPaletteYellowBorder2)
  },
  notificationCardError: {
    ...shorthands.borderColor(tokens.colorPaletteRedBorder2)
  },
  notificationCardDismissing: {
    animationName: FADE_OUT_NAME,
    animationDuration: `${NOTIFICATION_FADE_OUT_MS}ms`,
    animationTimingFunction: 'ease-in',
    animationFillMode: 'forwards',
    pointerEvents: 'none'
  },
  topRightControls: {
    position: 'absolute',
    top: tokens.spacingVerticalM,
    right: tokens.spacingHorizontalM,
    zIndex: 3
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
  },
  brushCursorCanvas: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1,
  },
  brushSizeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    minWidth: '140px',
  },
  brushSizeLabel: {
    minWidth: '24px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },

  // ── Paint color widget ───────────────────────────────────────────────────
  paintColorSwatch: {
    width: '36px',
    height: '36px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  paintColorTextCol: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
    gap: '2px',
  },
  paintColorIdText: {
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  paintColorHexText: {
    fontFamily: 'monospace',
    color: tokens.colorNeutralForeground3,
  },
  paintColorButtonCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '1px',
    flexShrink: 0,
  },
  paintColorButtonRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: '1px',
  },
  paintColorActionButton: {
    minWidth: '20px',
    width: '20px',
    height: '20px',
    padding: '1px',
    '& svg': { fontSize: '14px' },
  },

  // ── Paint tool widget ────────────────────────────────────────────────────
  paintToolWidget: {
    alignItems: 'flex-start',
  },
  widgetDivider: {
    width: '1px',
    alignSelf: 'stretch',
    backgroundColor: tokens.colorNeutralStroke2,
    flexShrink: 0,
  },
  selectionEmpty: {
    color: tokens.colorNeutralForeground3,
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateUniqueColor(isDraftColor: (packed: number) => boolean): number {
  for (let i = 0; i < 1000; i++) {
    const r = Math.floor(Math.random() * 255) + 1
    const g = Math.floor(Math.random() * 256)
    const b = Math.floor(Math.random() * 256)
    const packed = (r << 16) | (g << 8) | b
    if (!isDraftColor(packed)) return packed
  }
  for (let packed = 1; packed <= 0xffffff; packed++) {
    if (!isDraftColor(packed)) return packed
  }
  throw new Error('No unique province color available')
}

// ─── Notification tray ────────────────────────────────────────────────────────

function NotificationTray(): JSX.Element | null {
  useStaticStyles()
  const styles = useStyles()
  const { t } = useI18n()
  const notifications = useNotificationStore((s) => s.notifications)
  const dismissingIds = useNotificationStore((s) => s.dismissingIds)
  if (notifications.length === 0) return null
  return (
    <div className={styles.topLeftNotifications} onMouseDown={(e) => e.stopPropagation()}>
      <div className={styles.notificationTray}>
        {notifications.map((notification) => {
          const isDismissing = dismissingIds.has(notification.id)
          const notificationClass = mergeClasses(
            styles.notificationCard,
            notification.tone === 'success' && styles.notificationCardSuccess,
            notification.tone === 'warning' && styles.notificationCardWarning,
            notification.tone === 'error' && styles.notificationCardError,
            isDismissing && styles.notificationCardDismissing
          )
          return (
            <div
              key={notification.id}
              className={notificationClass}
              onAnimationEnd={isDismissing ? () => notificationService.dismiss(notification.id) : undefined}
            >
              <div className={styles.notificationHeader}>
                <Text size={300} weight="semibold" className={styles.notificationTitle}>
                  {notification.title}
                </Text>
                {notification.autoCloseAfterMs === null && (
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<DismissRegular />}
                    onClick={() => notificationService.dismiss(notification.id)}
                    aria-label={t('notification.dismiss')}
                  />
                )}
              </div>
              {notification.message && (
                <Text size={200} className={styles.notificationMessage}>{notification.message}</Text>
              )}
              {notification.kind === 'progress' && notification.progress && (
                <ProgressBar
                  className={styles.notificationProgress}
                  value={notification.progress.total <= 0 ? 0 : notification.progress.current / notification.progress.total}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function MapCanvas(): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const query = useMapQueryApi()
  const { canvasOverlays } = useOverlayAssets()

  // ── Store subscriptions ──────────────────────────────────────────────────
  const editorMode = useMapDataStore((s) => s.editorMode)
  const projectId = useMapDataStore((s) => s.projectId)
  const addBmpStroke = useMapDataStore((s) => s.addBmpStroke)
  const setBrushRadius = useMapDataStore((s) => s.setBrushRadius)
  const pendingRevertPixels = useMapDataStore((s) => s.pendingRevertPixels)
  const consumePendingRevert = useMapDataStore((s) => s.consumePendingRevert)
  const paintProvinceColor = useMapDataStore((s) => s.paintProvinceColor)
  const setPaintProvinceColor = useMapDataStore((s) => s.setPaintProvinceColor)
  const paintActiveTool = useMapDataStore((s) => s.paintActiveTool)
  const setPaintActiveTool = useMapDataStore((s) => s.setPaintActiveTool)
  const paintSelection = useMapDataStore((s) => s.paintSelection)
  const clearPaintSelection = useMapDataStore((s) => s.clearPaintSelection)
  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const pendingNewProvinces = useMapDataStore((s) => s.pendingNewProvinces)
  const syncBmpOnlyEntries = useMapDataStore((s) => s.syncBmpOnlyEntries)
  const assignBmpProvince = useMapDataStore((s) => s.assignBmpProvince)
  const revertNewProvince = useMapDataStore((s) => s.revertNewProvince)
  const removeBmpOnlyEntry = useMapDataStore((s) => s.removeBmpOnlyEntry)
  const pendingAutoGenerated = useMapDataStore((s) => s.pendingAutoGenerated)
  const setPendingAutoGenerated = useMapDataStore((s) => s.setPendingAutoGenerated)
  const pendingBmpStrokes = useMapDataStore((s) => s.pendingBmpStrokes)

  const {
    src, colorMap, highlightColors, validationWarningColors, validationErrorColors,
    activeTool, eyedropEnabled, bucketEnabled, sampledValueColor, sampledValueLabel,
    displayMode, modeValuesByMode, brushPaintConfig, brushRadius,
    onActiveToolChange, onMapClick,
    hoverTooltipPosition, hoverTooltip, onHoverColorChange, onDisplayModeChange,
  } = useMapViewportState()

  // ── Paint: pending auto-generated cleanup ────────────────────────────────

  const cleanupPendingAuto = useCallback(() => {
    const pending = useMapDataStore.getState().pendingAutoGenerated
    if (!pending) return
    if (pending.type === 'province') revertNewProvince(pending.guid)
    removeBmpOnlyEntry(pending.color)
    setPendingAutoGenerated(null)
  }, [revertNewProvince, removeBmpOnlyEntry, setPendingAutoGenerated])

  // Eyedropper changes paintProvinceColor away from pending → cleanup
  useEffect(() => {
    const pending = useMapDataStore.getState().pendingAutoGenerated
    if (!pending) return
    if (paintProvinceColor !== pending.color) cleanupPendingAuto()
  }, [paintProvinceColor, cleanupPendingAuto])

  // Stroke landed with pending color → it's in use, stop tracking
  useEffect(() => {
    if (!pendingAutoGenerated) return
    if (pendingBmpStrokes.some((s) => s.targetProvinceColor === pendingAutoGenerated.color)) {
      setPendingAutoGenerated(null)
    }
  }, [pendingBmpStrokes, pendingAutoGenerated, setPendingAutoGenerated])

  // ── Paint: new province handlers ─────────────────────────────────────────

  const handleNewProvince = useCallback(() => {
    cleanupPendingAuto()
    const color = generateUniqueColor((packed) => !!query.getDraftProvinceByColor(packed))
    const maxExisting = originalDefinitions.size > 0 ? Math.max(...originalDefinitions.keys()) : 0
    const nextId = maxExisting + pendingNewProvinces.size + 1
    syncBmpOnlyEntries([color])
    const guid = useMapDataStore.getState().bmpOnlyByColor.get(color)!
    assignBmpProvince(guid, { type: 'register', assignedId: nextId })
    setPendingAutoGenerated({ guid, color, type: 'province' })
    setPaintProvinceColor(color)
  }, [assignBmpProvince, cleanupPendingAuto, originalDefinitions, pendingNewProvinces, query, setPaintProvinceColor, setPendingAutoGenerated, syncBmpOnlyEntries])

  const handleNewUnregistered = useCallback(() => {
    cleanupPendingAuto()
    const color = generateUniqueColor((packed) => !!query.getDraftProvinceByColor(packed))
    syncBmpOnlyEntries([color])
    const guid = useMapDataStore.getState().bmpOnlyByColor.get(color)!
    setPendingAutoGenerated({ guid, color, type: 'unregistered' })
    setPaintProvinceColor(color)
  }, [cleanupPendingAuto, query, setPaintProvinceColor, setPendingAutoGenerated, syncBmpOnlyEntries])

  // ── Brush stroke completion ──────────────────────────────────────────────

  const getPixelSnapshotRef = useRef<(() => { data: Uint8ClampedArray; width: number; height: number } | null) | null>(null)

  const onBrushStrokeComplete = useCallback((pixels: BmpPixelStrokeDelta[], _affectedIds: Set<number>) => {
    if (pixels.length === 0) return
    addBmpStroke({
      id: crypto.randomUUID(),
      targetProvinceColor: paintProvinceColor ?? 0,
      pixelCount: pixels.length,
      pixels,
    })
    if (!projectId) return
    const snapshot = getPixelSnapshotRef.current?.()
    if (!snapshot) return
    void window.api.map.saveBmp(projectId, Array.from(snapshot.data), snapshot.width, snapshot.height)
  }, [addBmpStroke, paintProvinceColor, projectId])

  const {
    containerRef, canvasRef, brushCursorCanvasRef, dragging, displayScale, imageLoaded, isCanvasLoading,
    cursorPosition, onMouseDown, onMouseMove, stopDrag, zoomBy, fit, getPixelSnapshot,
    revertBrushStroke,
  } = useMapCanvas({
    src, overlays: canvasOverlays, highlightColors, validationWarningColors, validationErrorColors,
    colorMap, activeTool, brushPaintConfig, onMapClick, onHoverColorChange, onBrushStrokeComplete,
  })

  getPixelSnapshotRef.current = getPixelSnapshot

  useEffect(() => {
    if (!pendingRevertPixels || pendingRevertPixels.length === 0) return
    revertBrushStroke(pendingRevertPixels)
    consumePendingRevert()
  }, [pendingRevertPixels, revertBrushStroke, consumePendingRevert])

  // ── Derived paint display values ─────────────────────────────────────────

  const isPaintMode = editorMode === 'paint'

  const swatchRgb = paintProvinceColor !== null ? unpackColor(paintProvinceColor) : null
  const swatchStyle = swatchRgb
    ? { backgroundColor: `rgb(${swatchRgb.r},${swatchRgb.g},${swatchRgb.b})` }
    : undefined

  const draftProvince = isPaintMode && paintProvinceColor !== null
    ? query.getDraftProvinceByColor(paintProvinceColor)
    : undefined
  const provinceIdLabel = draftProvince?.provinceId != null
    ? `Province ${draftProvince.provinceId}`
    : draftProvince
      ? t('paintPanel.unregistered')
      : t('paintPanel.noProvince')
  const colorHexLabel = paintProvinceColor !== null
    ? `#${paintProvinceColor.toString(16).padStart(6, '0').toUpperCase()}`
    : '—'

  const rootClass = mergeClasses(
    styles.root,
    activeTool !== 'select' && activeTool !== 'brush' && activeTool !== 'select-color'
      ? styles.eyedropping
      : (dragging ? styles.dragging : undefined)
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
      <canvas ref={canvasRef} className={mergeClasses(styles.canvas, !imageLoaded && styles.canvasHidden)} />
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
            <Spinner size="medium" labelPosition="below" aria-label={t('mapCanvas.loading')} />
          </div>
        </div>
      )}
      <canvas
        ref={brushCursorCanvasRef}
        className={styles.brushCursorCanvas}
        style={{ display: isPaintMode && activeTool === 'brush' ? 'block' : 'none' }}
      />
      {hoverTooltipPosition && hoverTooltip && !dragging && (
        <div
          className={styles.hoverTooltip}
          style={{ transform: `translate(${hoverTooltipPosition.x + 14}px, ${hoverTooltipPosition.y + 14}px)` }}
        >
          <Text size={100} className={styles.hoverTooltipLabel}>{hoverTooltip.label}</Text>
          <Text size={200} weight="semibold" className={styles.hoverTooltipValue}>{hoverTooltip.value}</Text>
        </div>
      )}
      <div className={styles.topRightControls} onMouseDown={(e) => e.stopPropagation()}>
        <DisplayModeControl
          mode={displayMode}
          onModeChange={onDisplayModeChange}
          valuesByMode={modeValuesByMode}
        />
      </div>
      <NotificationTray />
      <div className={styles.controls} onMouseDown={(e) => e.stopPropagation()}>

        {/* ── Paint: color widget ── */}
        {isPaintMode && (
          <div className={styles.widget}>
            <div className={styles.paintColorSwatch} style={swatchStyle} />
            <div className={styles.paintColorTextCol}>
              <Text size={200} className={styles.paintColorIdText}>{provinceIdLabel}</Text>
              <Text size={200} className={styles.paintColorHexText}>{colorHexLabel}</Text>
            </div>
            <div className={styles.paintColorButtonCol}>
              <Tooltip content={t('paintPanel.tools.eyedrop')} relationship="label">
                <Button
                  appearance={paintActiveTool === 'eyedrop' ? 'primary' : 'subtle'}
                  size="small"
                  className={styles.paintColorActionButton}
                  icon={paintActiveTool === 'eyedrop' ? <EyedropperFilled /> : <EyedropperRegular />}
                  onClick={() => setPaintActiveTool('eyedrop')}
                />
              </Tooltip>
              <div className={styles.paintColorButtonRow}>
                <Tooltip content={t('paintPanel.newProvince')} relationship="label">
                  <Button
                    appearance="subtle"
                    size="small"
                    className={styles.paintColorActionButton}
                    icon={<AddCircleRegular />}
                    onClick={handleNewProvince}
                  />
                </Tooltip>
                <Tooltip content={t('paintPanel.newUnregistered')} relationship="label">
                  <Button
                    appearance="subtle"
                    size="small"
                    className={styles.paintColorActionButton}
                    icon={<AddRegular />}
                    onClick={handleNewUnregistered}
                  />
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {/* ── Paint: tool widget ── */}
        {isPaintMode && (
          <div className={mergeClasses(styles.widget, styles.paintToolWidget)}>
            <Tooltip content={t('paintPanel.tools.wand')} relationship="label">
              <Button
                appearance={paintActiveTool === 'select-color' ? 'primary' : 'subtle'}
                size="small"
                icon={paintActiveTool === 'select-color' ? <WandFilled /> : <WandRegular />}
                onClick={() => setPaintActiveTool('select-color')}
              />
            </Tooltip>
            <Tooltip content={t('paintPanel.tools.brush')} relationship="label">
              <Button
                appearance={paintActiveTool === 'brush' ? 'primary' : 'subtle'}
                size="small"
                icon={paintActiveTool === 'brush' ? <PenFilled /> : <PenRegular />}
                onClick={() => setPaintActiveTool('brush')}
              />
            </Tooltip>
            <div className={styles.widgetDivider} />
            {paintActiveTool !== 'select-color' ? (
              <div className={styles.brushSizeRow}>
                <Slider
                  min={1} max={30} step={1}
                  value={brushRadius}
                  onChange={(_, d) => setBrushRadius(d.value)}
                  style={{ flex: 1, minWidth: '80px' }}
                  size="small"
                />
                <Text size={200} className={styles.brushSizeLabel}>{brushRadius}</Text>
              </div>
            ) : (
              paintSelection.size === 0 ? (
                <Text size={100} className={styles.selectionEmpty}>{t('paintPanel.noSelection')}</Text>
              ) : (
                <Tooltip content={t('paintPanel.clearSelection', { count: paintSelection.size })} relationship="label">
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<DismissRegular />}
                    onClick={clearPaintSelection}
                  >
                    <Text size={200}>{paintSelection.size}</Text>
                  </Button>
                </Tooltip>
              )
            )}
          </div>
        )}

        {/* ── Non-paint: eyedrop + bucket widget ── */}
        {!isPaintMode && (
          <div className={styles.widget}>
            <Tooltip content={t('mapCanvas.eyedrop')} relationship="label">
              <Button
                appearance={activeTool === 'eyedrop' ? 'primary' : 'subtle'}
                size="small"
                icon={activeTool === 'eyedrop' ? <EyedropperFilled /> : <EyedropperRegular />}
                onClick={() => onActiveToolChange?.(activeTool === 'eyedrop' ? 'select' : 'eyedrop')}
                disabled={!eyedropEnabled}
              />
            </Tooltip>
            <div
              className={styles.colorSwatch}
              style={{ backgroundColor: sampledValueColor ?? tokens.colorNeutralBackground4 }}
            />
            <Text size={200} className={styles.colorLabel}>
              {sampledValueLabel ?? t('mapValue.none')}
            </Text>
            <Tooltip content={t('mapCanvas.bucket')} relationship="label">
              <Button
                appearance={activeTool === 'bucket' ? 'primary' : 'subtle'}
                size="small"
                icon={activeTool === 'bucket' ? <PaintBucketFilled /> : <PaintBucketRegular />}
                onClick={() => onActiveToolChange?.(activeTool === 'bucket' ? 'select' : 'bucket')}
                disabled={!bucketEnabled}
              />
            </Tooltip>
          </div>
        )}

        {/* ── Zoom widget ── */}
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
