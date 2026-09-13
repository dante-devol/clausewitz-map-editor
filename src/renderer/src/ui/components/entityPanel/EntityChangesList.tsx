import {
  Button,
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  shorthands
} from '@fluentui/react-components'
import { ChevronDownRegular, ChevronUpRegular, DismissRegular } from '@fluentui/react-icons'

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
    fontFamily: 'monospace',
    ...shorthands.borderColor('rgba(227, 164, 0, 0.32)'),
    backgroundColor: 'rgba(227, 164, 0, 0.12)',
    color: tokens.colorPaletteGoldForeground2
  },
  label: {
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
    color: tokens.colorNeutralForeground2
  },
  rowSpacer: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  fieldCount: {
    color: tokens.colorNeutralForeground3,
    flexShrink: 0
  },
  empty: {
    padding: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center'
  }
})

export interface EntityChangeEntry {
  id: number
  name: string
  fieldCount: number
}

interface EntityChangesListProps {
  title: string
  entries: EntityChangeEntry[]
  emptyText: string
  fieldCountLabel: (count: number) => string
  revertLabel: string
  selectedId: number | null
  onSelect: (id: number) => void
  onRevert: (id: number) => void
  collapsed: boolean
  onToggleCollapse: () => void
  formatCount: (n: number) => string
}

/**
 * Shared "pending changes" list used by the state and strategic-region
 * panels: a collapsible, badge-counted list of edited entities with a
 * per-row revert action.
 */
export function EntityChangesList({
  title,
  entries,
  emptyText,
  fieldCountLabel,
  revertLabel,
  selectedId,
  onSelect,
  onRevert,
  collapsed,
  onToggleCollapse,
  formatCount
}: EntityChangesListProps): JSX.Element {
  const styles = useStyles()

  return (
    <div className={mergeClasses(styles.section, collapsed && styles.sectionCollapsed)}>
      <div className={styles.header} onClick={onToggleCollapse}>
        <Text size={100} weight="semibold" className={styles.title}>{title}</Text>
        <Text size={100} className={mergeClasses(styles.count, entries.length > 0 && styles.countPending)}>
          {formatCount(entries.length)}
        </Text>
        <div className={styles.headerSpacer} />
        {collapsed
          ? <ChevronDownRegular className={styles.chevron} />
          : <ChevronUpRegular className={styles.chevron} />}
      </div>

      {!collapsed && (
        entries.length === 0 ? (
          <Text size={200} className={styles.empty}>{emptyText}</Text>
        ) : (
          <div className={styles.scroll}>
            <div className={styles.changeList}>
              {entries.map((entry) => {
                const isSelected = entry.id === selectedId
                return (
                  <div
                    key={entry.id}
                    role="button"
                    tabIndex={0}
                    className={mergeClasses(styles.row, isSelected && styles.rowSelected)}
                    onClick={() => onSelect(entry.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(entry.id) }}
                  >
                    <Text size={100} className={styles.kindBadge}>edit</Text>
                    <Text size={100} className={styles.label}>{entry.id}</Text>
                    <Text size={100} className={styles.rowSpacer}>{entry.name}</Text>
                    <Text size={100} className={styles.fieldCount}>{fieldCountLabel(entry.fieldCount)}</Text>
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<DismissRegular />}
                      aria-label={revertLabel}
                      onClick={(e) => { e.stopPropagation(); onRevert(entry.id) }}
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
