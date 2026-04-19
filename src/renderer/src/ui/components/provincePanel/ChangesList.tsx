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
import type { PendingChange, SelectionOrigin } from '../../../../../shared/provinceEditing'
import { useI18n } from '../../i18n/I18nProvider'

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
  kindReplace: {
    ...shorthands.borderColor('rgba(0, 120, 212, 0.28)'),
    backgroundColor: 'rgba(0, 120, 212, 0.10)',
    color: tokens.colorBrandForeground1
  },
  kindRegister: {
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
  provinceId: {
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
  targetChip: {
    padding: `2px ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    fontFamily: 'monospace',
    flexShrink: 0
  },
  targetChipReplace: {
    ...shorthands.borderColor('rgba(0, 120, 212, 0.28)'),
    backgroundColor: 'rgba(0, 120, 212, 0.10)',
    color: tokens.colorBrandForeground1
  },
  targetChipRegister: {
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
  changes: PendingChange[]
  selectedChangeId: string | undefined
  onCrossSelect?: (origin: SelectionOrigin) => void
  onRevert: (changeId: string) => void
}

export function ChangesList({
  collapsed,
  onToggleCollapse,
  changes,
  selectedChangeId,
  onCrossSelect,
  onRevert
}: Props): JSX.Element {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()

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
                const isSelected = change.changeId === selectedChangeId

                const color = change.kind === 'field-edit'
                  ? change.original.color
                  : change.bmpColor
                const { r, g, b } = unpackColor(color)

                const idLabel = change.kind === 'field-edit'
                  ? String(change.provinceId)
                  : change.guid

                return (
                  <div
                    key={change.changeId}
                    role="button"
                    tabIndex={0}
                    className={mergeClasses(styles.row, isSelected && styles.rowSelected)}
                    onClick={() => onCrossSelect?.({ list: 'changes', changeId: change.changeId })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onCrossSelect?.({ list: 'changes', changeId: change.changeId })
                      }
                    }}
                  >
                    <Text size={100} className={mergeClasses(styles.kindBadge, kindClass(change, styles))}>
                      {kindLabel(change)}
                    </Text>
                    <div className={styles.swatch} style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
                    <Text size={100} className={styles.provinceId}>{idLabel}</Text>

                    {change.kind === 'field-edit' ? (
                      <>
                        <div className={styles.rowSpacer} />
                        <Text size={100} className={styles.fieldCount}>
                          {t('provincePanel.changes.fieldCount', { count: Object.keys(change.patch).length })}
                        </Text>
                      </>
                    ) : change.action.type === 'replace' ? (
                      <>
                        <div className={styles.rowSpacer} />
                        <Text size={100} className={mergeClasses(styles.targetChip, styles.targetChipReplace)}>
                          → {change.action.targetId}
                        </Text>
                      </>
                    ) : (
                      <>
                        <div className={styles.rowSpacer} />
                        <Text size={100} className={mergeClasses(styles.targetChip, styles.targetChipRegister)}>
                          #{change.action.assignedId}
                        </Text>
                      </>
                    )}

                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<DismissRegular />}
                      aria-label={t('provincePanel.changes.revert')}
                      onClick={(e) => {
                        e.stopPropagation()
                        onRevert(change.changeId)
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

function kindClass(change: PendingChange, styles: ReturnType<typeof useStyles>): string {
  if (change.kind === 'field-edit') return styles.kindEdit
  if (change.action.type === 'replace') return styles.kindReplace
  return styles.kindRegister
}

function kindLabel(change: PendingChange): string {
  if (change.kind === 'field-edit') return 'edit'
  if (change.action.type === 'replace') return '→'
  return '+'
}
