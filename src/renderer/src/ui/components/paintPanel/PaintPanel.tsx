import { useState } from 'react'
import {
  makeStyles, tokens, Button, Text, Tooltip,
  shorthands
} from '@fluentui/react-components'
import { ChevronDownRegular, ChevronUpRegular, DismissRegular } from '@fluentui/react-icons'
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { unpackColor } from '../../../../../shared/mapDataTypes'
import type { BmpPixelStroke } from '../../../../../shared/provinceEditing'

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
  noProvince: {
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalS}`,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    flexShrink: 0,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  paintingAs: {
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  paintSwatch: {
    width: '16px',
    height: '16px',
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
})

export function PaintPanel(): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const [collapsed, setCollapsed] = useState(false)

  const pendingBmpStrokes = useMapDataStore((s) => s.pendingBmpStrokes)
  const revertBmpStroke = useMapDataStore((s) => s.revertBmpStroke)
  const paintProvinceColor = useMapDataStore((s) => s.paintProvinceColor)

  const hasPending = pendingBmpStrokes.length > 0

  const paintSwatchColor = paintProvinceColor !== null
    ? (() => { const { r, g, b } = unpackColor(paintProvinceColor); return `rgb(${r},${g},${b})` })()
    : null

  return (
    <div className={styles.root}>
      {paintProvinceColor !== null ? (
        <div className={styles.paintingAs}>
          <div className={styles.paintSwatch} style={{ backgroundColor: paintSwatchColor ?? undefined }} />
          <Text size={200}>{t('paintPanel.paintingAs')}</Text>
          <Text size={200} style={{ fontFamily: 'monospace' }}>
            #{paintProvinceColor.toString(16).padStart(6, '0').toUpperCase()}
          </Text>
        </div>
      ) : (
        <div className={styles.noProvince}>
          <Text size={200}>{t('paintPanel.noProvince')}</Text>
        </div>
      )}

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
