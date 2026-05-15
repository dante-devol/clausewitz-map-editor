import { useCallback, useRef, useState } from 'react'
import {
  makeStyles, tokens, Button, Text, Tooltip,
  shorthands, Dialog, DialogTrigger, DialogSurface, DialogBody,
  DialogTitle, DialogContent, DialogActions,
} from '@fluentui/react-components'
import {
  ChevronDownRegular, ChevronUpRegular, DismissRegular,
  EyedropperRegular, EyedropperFilled,
  PenRegular, PenFilled,
  WandRegular, WandFilled,
} from '@fluentui/react-icons'
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { useMapQueryApi } from '../../../bridge/MapQueryProvider'
import { unpackColor } from '../../../../../shared/mapDataTypes'
import type { BmpPixelStroke } from '../../../../../shared/provinceEditing'
import type { PaintActiveTool } from '../../../infra/store/slices/bmpEditSlice'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'hidden',
  },
  sectionCollapsed: { flex: '0 0 auto' },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    cursor: 'pointer',
    userSelect: 'none',
    '&:hover': { backgroundColor: tokens.colorNeutralBackground2 },
  },
  headerSpacer: { flex: 1 },
  chevron: { fontSize: '12px', color: tokens.colorNeutralForeground3 },
  count: {
    color: tokens.colorNeutralForeground3,
    padding: `0 ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  countPending: {
    color: tokens.colorPaletteGoldForeground2,
    backgroundColor: 'rgba(227, 164, 0, 0.12)',
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
  },
  changeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
    paddingRight: tokens.spacingHorizontalXXS,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorTransparentStroke}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    minWidth: 0,
    overflow: 'hidden',
  },
  swatch: {
    width: '12px',
    height: '12px',
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.borderColor('rgba(255,255,255,0.35)'),
    flexShrink: 0,
    boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground4}`,
  },
  empty: {
    padding: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
  // Color picker section
  colorPickerSection: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  paintSwatch: {
    width: '20px',
    height: '20px',
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    cursor: 'pointer',
  },
  paintSwatchNone: {
    backgroundColor: tokens.colorNeutralBackground3,
  },
  paintColorLabel: {
    flex: 1,
    fontFamily: 'monospace',
    color: tokens.colorNeutralForeground2,
  },
  // Tools section
  toolsSection: {
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  toolsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  toolsSpacer: { flex: 1 },
  // Color picker dialog
  colorInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalS,
  },
  colorInput: {
    width: '48px',
    height: '48px',
    borderRadius: tokens.borderRadiusMedium,
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    backgroundColor: 'transparent',
  },
  colorHexLabel: {
    fontFamily: 'monospace',
    fontSize: '18px',
  },
  colorWarning: {
    color: tokens.colorPaletteGoldForeground2,
    display: 'block',
    marginBottom: tokens.spacingVerticalXS,
  },
  selectionBadge: {
    minWidth: '18px',
    height: '18px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `0 ${tokens.spacingHorizontalXXS}`,
  },
})

export function PaintPanel(): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const [collapsed, setCollapsed] = useState(false)

  const pendingBmpStrokes = useMapDataStore((s) => s.pendingBmpStrokes)
  const revertBmpStroke = useMapDataStore((s) => s.revertBmpStroke)
  const paintActiveTool = useMapDataStore((s) => s.paintActiveTool)
  const setPaintActiveTool = useMapDataStore((s) => s.setPaintActiveTool)
  const paintProvinceColor = useMapDataStore((s) => s.paintProvinceColor)
  const setPaintProvinceColor = useMapDataStore((s) => s.setPaintProvinceColor)
  const paintSelection = useMapDataStore((s) => s.paintSelection)
  const clearPaintSelection = useMapDataStore((s) => s.clearPaintSelection)

  const hasPending = pendingBmpStrokes.length > 0

  const paintSwatchColor = paintProvinceColor !== null
    ? (() => { const { r, g, b } = unpackColor(paintProvinceColor); return `rgb(${r},${g},${b})` })()
    : null

  const onToolClick = useCallback((tool: PaintActiveTool) => {
    setPaintActiveTool(tool)
  }, [setPaintActiveTool])

  return (
    <div className={styles.root}>
      {/* Color picker */}
      <ColorPickerSection
        paintProvinceColor={paintProvinceColor}
        paintSwatchColor={paintSwatchColor}
        setPaintProvinceColor={setPaintProvinceColor}
      />

      {/* Tools */}
      <div className={styles.toolsSection}>
        <div className={styles.toolsRow}>
          <Text size={200} weight="semibold">{t('paintPanel.tools.title')}</Text>
          <div className={styles.toolsSpacer} />
          {paintSelection.size > 0 && (
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
          )}
        </div>
        <div className={styles.toolsRow}>
          <Tooltip content={t('paintPanel.tools.eyedrop')} relationship="label">
            <Button
              appearance={paintActiveTool === 'eyedrop' ? 'primary' : 'subtle'}
              size="small"
              icon={paintActiveTool === 'eyedrop' ? <EyedropperFilled /> : <EyedropperRegular />}
              onClick={() => onToolClick('eyedrop')}
            />
          </Tooltip>
          <Tooltip content={t('paintPanel.tools.brush')} relationship="label">
            <Button
              appearance={paintActiveTool === 'brush' ? 'primary' : 'subtle'}
              size="small"
              icon={paintActiveTool === 'brush' ? <PenFilled /> : <PenRegular />}
              onClick={() => onToolClick('brush')}
            />
          </Tooltip>
          <Tooltip content={t('paintPanel.tools.wand')} relationship="label">
            <Button
              appearance={paintActiveTool === 'select-color' ? 'primary' : 'subtle'}
              size="small"
              icon={paintActiveTool === 'select-color' ? <WandFilled /> : <WandRegular />}
              onClick={() => onToolClick('select-color')}
            />
          </Tooltip>
        </div>
      </div>

      {/* Pending strokes */}
      <div className={collapsed ? styles.sectionCollapsed : styles.section}>
        <div className={styles.header} onClick={() => setCollapsed((c) => !c)}>
          <Text size={200} weight="semibold">{t('paintPanel.changes.title')}</Text>
          {hasPending && (
            <Text size={100} className={`${styles.count} ${styles.countPending}`}>
              {pendingBmpStrokes.length}
            </Text>
          )}
          <div className={styles.headerSpacer} />
          {collapsed ? <ChevronUpRegular className={styles.chevron} /> : <ChevronDownRegular className={styles.chevron} />}
        </div>

        {!collapsed && (
          <div className={styles.scroll}>
            {pendingBmpStrokes.length === 0 ? (
              <Text size={200} className={styles.empty}>{t('paintPanel.changes.empty')}</Text>
            ) : (
              <div className={styles.changeList}>
                {[...pendingBmpStrokes].reverse().map((stroke) => (
                  <StrokeRow
                    key={stroke.id}
                    stroke={stroke}
                    onRevert={() => revertBmpStroke(stroke.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface ColorPickerSectionProps {
  paintProvinceColor: number | null
  paintSwatchColor: string | null
  setPaintProvinceColor: (color: number | null) => void
}

function ColorPickerSection({ paintProvinceColor, paintSwatchColor, setPaintProvinceColor }: ColorPickerSectionProps): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const query = useMapQueryApi()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pickedHex, setPickedHex] = useState<string>('#ffffff')
  const inputRef = useRef<HTMLInputElement>(null)

  const openDialog = () => {
    const initialHex = paintProvinceColor !== null
      ? `#${paintProvinceColor.toString(16).padStart(6, '0')}`
      : '#ffffff'
    setPickedHex(initialHex)
    setDialogOpen(true)
  }

  const pickedPacked = (() => {
    const hex = pickedHex.replace('#', '')
    if (hex.length !== 6) return null
    const v = parseInt(hex, 16)
    return isNaN(v) ? null : v
  })()

  const pickedRgb = pickedPacked !== null
    ? { r: (pickedPacked >> 16) & 0xff, g: (pickedPacked >> 8) & 0xff, b: pickedPacked & 0xff }
    : null

  const inUse = pickedPacked !== null
    ? !!query.getDraftProvinceByColor(pickedPacked)
    : false

  const onConfirm = () => {
    if (pickedPacked !== null) {
      setPaintProvinceColor(pickedPacked)
    }
    setDialogOpen(false)
  }

  return (
    <div className={styles.colorPickerSection}>
      <div
        className={`${styles.paintSwatch} ${paintSwatchColor ? '' : styles.paintSwatchNone}`}
        style={{ backgroundColor: paintSwatchColor ?? undefined }}
        onClick={openDialog}
        title={t('paintPanel.colorPicker.button')}
      />
      <Text size={200} className={styles.paintColorLabel}>
        {paintProvinceColor !== null
          ? `#${paintProvinceColor.toString(16).padStart(6, '0').toUpperCase()}`
          : t('paintPanel.noProvince')}
      </Text>
      <Button appearance="subtle" size="small" onClick={openDialog}>
        {t('paintPanel.colorPicker.button')}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('paintPanel.colorPicker.title')}</DialogTitle>
            <DialogContent>
              <div className={styles.colorInputRow}>
                <input
                  ref={inputRef}
                  type="color"
                  className={styles.colorInput}
                  value={pickedHex}
                  onChange={(e) => setPickedHex(e.target.value)}
                />
                <Text className={styles.colorHexLabel}>
                  {pickedHex.toUpperCase()}
                </Text>
                {pickedRgb && (
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    rgb({pickedRgb.r}, {pickedRgb.g}, {pickedRgb.b})
                  </Text>
                )}
              </div>
              {inUse && (
                <Text size={200} className={styles.colorWarning}>
                  ⚠ {t('paintPanel.colorPicker.inUse')}
                </Text>
              )}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">{t('paintPanel.colorPicker.cancel')}</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={onConfirm} disabled={pickedPacked === null}>
                {t('paintPanel.colorPicker.confirm')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}

function StrokeRow({ stroke, onRevert }: { stroke: BmpPixelStroke; onRevert: () => void }): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const { r, g, b } = unpackColor(stroke.targetProvinceColor)

  return (
    <div className={styles.row}>
      <div className={styles.swatch} style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
      <Text size={200} style={{ flex: 1, minWidth: 0 }}>
        {t('paintPanel.changes.stroke', { count: stroke.pixelCount })}
      </Text>
      <Tooltip content={t('paintPanel.changes.revert')} relationship="label">
        <Button appearance="subtle" size="small" icon={<DismissRegular />} onClick={onRevert} />
      </Tooltip>
    </div>
  )
}
