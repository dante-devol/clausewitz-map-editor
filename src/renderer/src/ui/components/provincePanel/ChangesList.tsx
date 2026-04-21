import { useRef } from 'react'
import {
  Button,
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  shorthands
} from '@fluentui/react-components'
import { ChevronDownRegular, ChevronUpRegular, DismissRegular } from '@fluentui/react-icons'
import { unpackColor } from '../../../../../shared/mapDataTypes'
import type { PendingChange } from '../../../../../shared/provinceEditing'
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { useCrossSelection } from './useCrossSelection'

const useStyles = makeStyles({
  section: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'hidden'
  },
  sectionCollapsed: {
    flex: '0 0 auto'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    cursor: 'pointer',
    userSelect: 'none',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground2
    }
  },
  title: {
    minWidth: 0
  },
  count: {
    color: tokens.colorNeutralForeground3,
    padding: `0 ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3
  },
  countPending: {
    color: tokens.colorPaletteGoldForeground2,
    backgroundColor: 'rgba(227, 164, 0, 0.12)'
  },
  headerSpacer: {
    flex: 1
  },
  chevron: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`
  },
  changeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS
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
    cursor: 'pointer',
    minWidth: 0,
    overflow: 'hidden',
    transitionProperty: 'background-color, border-color',
    transitionDuration: tokens.durationNormal,
    transitionTimingFunction: tokens.curveEasyEase,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground2,
      border: `1px solid ${tokens.colorNeutralStroke2}`
    }
  },
  rowSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke1}`,
    '&:hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      border: `1px solid ${tokens.colorBrandStroke1}`
    }
  },
  kindBadge: {
    padding: `2px ${tokens.spacingHorizontalXXS}`,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    flexShrink: 0,
    fontFamily: 'monospace'
  },
  kindEdit: {
    ...shorthands.borderColor('rgba(227, 164, 0, 0.32)'),
    backgroundColor: 'rgba(227, 164, 0, 0.12)',
    color: tokens.colorPaletteGoldForeground2
  },
  kindBmp: {
    ...shorthands.borderColor('rgba(0, 120, 212, 0.28)'),
    backgroundColor: 'rgba(0, 120, 212, 0.10)',
    color: tokens.colorBrandForeground1
  },
  kindNew: {
    ...shorthands.borderColor('rgba(55, 145, 80, 0.32)'),
    backgroundColor: 'rgba(55, 145, 80, 0.12)',
    color: tokens.colorPaletteGreenForeground1
  },
  swatch: {
    width: '12px',
    height: '12px',
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.borderColor('rgba(255,255,255,0.35)'),
    flexShrink: 0,
    boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground4}`
  },
  label: {
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
    color: tokens.colorNeutralForeground2,
    letterSpacing: '0.02em'
  },
  rowSpacer: {
    flex: 1,
    minWidth: 0
  },
  fieldCount: {
    color: tokens.colorNeutralForeground3,
    flexShrink: 0
  },
  chip: {
    padding: `2px ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    fontFamily: 'monospace',
    flexShrink: 0
  },
  chipBmp: {
    ...shorthands.borderColor('rgba(0, 120, 212, 0.28)'),
    backgroundColor: 'rgba(0, 120, 212, 0.10)',
    color: tokens.colorBrandForeground1
  },
  chipNew: {
    ...shorthands.borderColor('rgba(55, 145, 80, 0.32)'),
    backgroundColor: 'rgba(55, 145, 80, 0.12)',
    color: tokens.colorPaletteGreenForeground1
  },
  empty: {
    padding: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center'
  }
})

interface Props {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function ChangesList({ collapsed, onToggleCollapse }: Props): JSX.Element {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const lastClickedChangeIdRef = useRef<string | null>(null)

  const { changes, crossSelectedChangeId } = useCrossSelection()
  const setSelection = useMapDataStore((s) => s.setSelection)
  const extendSelection = useMapDataStore((s) => s.extendSelection)
  const setSelectedBmpGuids = useMapDataStore((s) => s.setSelectedBmpGuids)
  const toggleBmpGuid = useMapDataStore((s) => s.toggleBmpGuid)
  const revertEdit = useMapDataStore((s) => s.revertEdit)
  const revertBmpOnlyEdit = useMapDataStore((s) => s.revertBmpOnlyEdit)
  const revertBmpReplacement = useMapDataStore((s) => s.revertBmpReplacement)
  const revertNewProvince = useMapDataStore((s) => s.revertNewProvince)
  const clearAllSelection = useMapDataStore((s) => s.clearAllSelection)

  const handleRevert = (changeId: string) => {
    if (changeId.startsWith('field-edit:')) {
      revertEdit(parseInt(changeId.slice('field-edit:'.length), 10))
    } else if (changeId.startsWith('bmp-field-edit:')) {
      revertBmpOnlyEdit(changeId.slice('bmp-field-edit:'.length))
    } else if (changeId.startsWith('bmp-replacement:')) {
      revertBmpReplacement(parseInt(changeId.slice('bmp-replacement:'.length), 10))
    } else if (changeId.startsWith('new-province:')) {
      revertNewProvince(changeId.slice('new-province:'.length))
    }
    clearAllSelection()
  }

  const handleChangeClick = (change: PendingChange, e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault()
      // Additive selection on shift+click
      if (change.kind === 'field-edit' || change.kind === 'bmp-replacement') {
        extendSelection([change.provinceId])
      } else if (change.kind === 'new-province' || change.kind === 'bmp-field-edit') {
        toggleBmpGuid(change.bmpGuid)
      }
    } else {
      // Regular click — replace selection
      if (change.kind === 'field-edit' || change.kind === 'bmp-replacement') {
        setSelection([change.provinceId])
      } else if (change.kind === 'new-province' || change.kind === 'bmp-field-edit') {
        setSelectedBmpGuids([change.bmpGuid])
      }
    }
    lastClickedChangeIdRef.current = change.changeId
  }

  return (
    <div className={mergeClasses(styles.section, collapsed && styles.sectionCollapsed)}>
      <div className={styles.header} onClick={onToggleCollapse}>
        <Text size={100} weight="semibold" className={styles.title}>
          {t('provincePanel.changes.title')}
        </Text>
        <Text size={100} className={mergeClasses(styles.count, changes.length > 0 && styles.countPending)}>
          {formatNumber(changes.length)}
        </Text>
        <div className={styles.headerSpacer} />
        {collapsed
          ? <ChevronDownRegular className={styles.chevron} />
          : <ChevronUpRegular className={styles.chevron} />}
      </div>

      {!collapsed && (
        changes.length === 0 ? (
          <Text size={200} className={styles.empty}>{t('provincePanel.changes.empty')}</Text>
        ) : (
          <div className={styles.scroll}>
            <div className={styles.changeList}>
              {changes.map((change) => {
                const isCrossSelected = change.changeId === crossSelectedChangeId

                return (
                  <div
                    key={change.changeId}
                    role="button"
                    tabIndex={0}
                    className={mergeClasses(styles.row, isCrossSelected && styles.rowSelected)}
                    onClick={(e) => handleChangeClick(change, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleChangeClick(change, e as unknown as React.MouseEvent)
                      }
                    }}
                  >
                    <Text size={100} className={mergeClasses(styles.kindBadge, kindClass(change, styles))}>
                      {kindLabel(change)}
                    </Text>

                    {change.kind === 'field-edit' && <FieldEditRow change={change} styles={styles} t={t} />}
                    {change.kind === 'bmp-field-edit' && <BmpFieldEditRow change={change} styles={styles} t={t} />}
                    {change.kind === 'bmp-replacement' && <BmpReplacementRow change={change} styles={styles} />}
                    {change.kind === 'new-province' && <NewProvinceRow change={change} styles={styles} />}

                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<DismissRegular />}
                      aria-label={t('provincePanel.changes.revert')}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRevert(change.changeId)
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}
    </div>
  )
}

function FieldEditRow({
  change,
  styles,
  t
}: {
  change: Extract<PendingChange, { kind: 'field-edit' }>
  styles: ReturnType<typeof useStyles>
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const { r, g, b } = unpackColor(change.original.color)
  return (
    <>
      <div className={styles.swatch} style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
      <Text size={100} className={styles.label}>{change.provinceId}</Text>
      <div className={styles.rowSpacer} />
      <Text size={100} className={styles.fieldCount}>
        {t('provincePanel.changes.fieldCount', { count: Object.keys(change.patch).length })}
      </Text>
    </>
  )
}

function BmpFieldEditRow({
  change,
  styles,
  t
}: {
  change: Extract<PendingChange, { kind: 'bmp-field-edit' }>
  styles: ReturnType<typeof useStyles>
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const { r, g, b } = unpackColor(change.bmpColor)
  return (
    <>
      <div className={styles.swatch} style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
      <Text size={100} className={styles.label}>{change.bmpGuid}</Text>
      <div className={styles.rowSpacer} />
      <Text size={100} className={styles.fieldCount}>
        {t('provincePanel.changes.fieldCount', { count: Object.keys(change.patch).length })}
      </Text>
    </>
  )
}

function BmpReplacementRow({
  change,
  styles
}: {
  change: Extract<PendingChange, { kind: 'bmp-replacement' }>
  styles: ReturnType<typeof useStyles>
}) {
  const { r, g, b } = unpackColor(change.bmpColor)
  return (
    <>
      <div className={styles.swatch} style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
      <Text size={100} className={styles.label}>{change.provinceId}</Text>
      <div className={styles.rowSpacer} />
      <Text size={100} className={mergeClasses(styles.chip, styles.chipBmp)}>
        {change.bmpGuid}
      </Text>
    </>
  )
}

function NewProvinceRow({
  change,
  styles
}: {
  change: Extract<PendingChange, { kind: 'new-province' }>
  styles: ReturnType<typeof useStyles>
}) {
  const { r, g, b } = unpackColor(change.bmpColor)
  return (
    <>
      <div className={styles.swatch} style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
      <Text size={100} className={styles.label}>{change.bmpGuid}</Text>
      <div className={styles.rowSpacer} />
      <Text size={100} className={mergeClasses(styles.chip, styles.chipNew)}>
        #{change.assignedId}
      </Text>
    </>
  )
}

function kindClass(change: PendingChange, styles: ReturnType<typeof useStyles>): string {
  if (change.kind === 'field-edit' || change.kind === 'bmp-field-edit') return styles.kindEdit
  if (change.kind === 'bmp-replacement') return styles.kindBmp
  return styles.kindNew
}

function kindLabel(change: PendingChange): string {
  if (change.kind === 'field-edit' || change.kind === 'bmp-field-edit') return 'edit'
  if (change.kind === 'bmp-replacement') return 'assign'
  return 'new'
}
