import type { ReactNode } from 'react'
import { makeStyles, mergeClasses, tokens, Button, Spinner, Text, Tooltip, Skeleton, SkeletonItem, ProgressBar, shorthands } from '@fluentui/react-components'
import { ZoomInRegular, ZoomOutRegular, FullScreenMaximizeRegular, EyedropperRegular, EyedropperFilled, PaintBucketRegular, PaintBucketFilled, DismissRegular } from '@fluentui/react-icons'
import { useI18n } from '../i18n/I18nProvider'
import { useMapCanvas } from '../hooks/useMapCanvas'
import type { CanvasOverlay } from '../contracts/CanvasOverlay'
import type { NotificationRecord } from '../../infra/store/notificationStore'
import type { HoveredColor } from '../hooks/useMapCanvas'

const ZOOM_STEP = 1.25

interface HoverTooltipPosition { x: number; y: number }

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
  }
})

interface Props {
  src: string | null
  overlays?: CanvasOverlay[]
  highlightColors: number[]
  validationWarningColors: number[]
  validationErrorColors: number[]
  colorMap?: Map<number, number> | null
  activeTool: 'select' | 'eyedrop' | 'bucket'
  eyedropEnabled: boolean
  bucketEnabled: boolean
  sampledValueColor?: string | null
  sampledValueLabel?: string | null
  notifications?: NotificationRecord[]
  onDismissNotification?: (id: string) => void
  onActiveToolChange?: (tool: 'select' | 'eyedrop' | 'bucket') => void
  onMapClick?: (r: number, g: number, b: number, additive: boolean) => void
  hoverTooltipPosition?: HoverTooltipPosition | null
  hoverTooltip?: { label: string; value: string } | null
  onHoverColorChange?: (color: HoveredColor | null) => void
  topRightContent?: ReactNode
}

export function MapCanvas({
  src,
  overlays = [],
  highlightColors,
  validationWarningColors,
  validationErrorColors,
  colorMap,
  activeTool,
  eyedropEnabled,
  bucketEnabled,
  sampledValueColor,
  sampledValueLabel,
  notifications = [],
  onDismissNotification,
  onActiveToolChange,
  onMapClick,
  hoverTooltipPosition,
  hoverTooltip,
  onHoverColorChange,
  topRightContent
}: Props): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const { containerRef, canvasRef, dragging, displayScale, imageLoaded, isCanvasLoading, onMouseDown, onMouseMove, stopDrag, zoomBy, fit } = useMapCanvas({
    src, overlays, highlightColors, validationWarningColors, validationErrorColors, colorMap, activeTool, onMapClick, onHoverColorChange
  })

  const rootClass = mergeClasses(
    styles.root,
    activeTool !== 'select' ? styles.eyedropping : (dragging ? styles.dragging : undefined)
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
      {hoverTooltipPosition && hoverTooltip && !dragging && (
        <div
          className={styles.hoverTooltip}
          style={{ transform: `translate(${hoverTooltipPosition.x + 14}px, ${hoverTooltipPosition.y + 14}px)` }}
        >
          <Text size={100} className={styles.hoverTooltipLabel}>{hoverTooltip.label}</Text>
          <Text size={200} weight="semibold" className={styles.hoverTooltipValue}>{hoverTooltip.value}</Text>
        </div>
      )}
      {topRightContent && (
        <div className={styles.topRightControls} onMouseDown={(e) => e.stopPropagation()}>
          {topRightContent}
        </div>
      )}
      {notifications.length > 0 && (
        <div className={styles.topLeftNotifications} onMouseDown={(e) => e.stopPropagation()}>
          <div className={styles.notificationTray}>
            {notifications.map((notification) => {
              const notificationClass = mergeClasses(
                styles.notificationCard,
                notification.tone === 'success' && styles.notificationCardSuccess,
                notification.tone === 'warning' && styles.notificationCardWarning,
                notification.tone === 'error' && styles.notificationCardError
              )
              return (
                <div key={notification.id} className={notificationClass}>
                  <div className={styles.notificationHeader}>
                    <Text size={300} weight="semibold" className={styles.notificationTitle}>
                      {notification.title}
                    </Text>
                    {notification.autoCloseAfterMs === null && (
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<DismissRegular />}
                        onClick={() => onDismissNotification?.(notification.id)}
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
      )}
      <div className={styles.controls} onMouseDown={(e) => e.stopPropagation()}>
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
