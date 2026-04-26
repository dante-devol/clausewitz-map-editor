import {
  Button,
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  shorthands
} from '@fluentui/react-components'
import { ChevronDownRegular, ChevronUpRegular, DismissRegular } from '@fluentui/react-icons'
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'

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
    minWidth: 0
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

interface Props {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function StateChangesList({ collapsed, onToggleCollapse }: Props): JSX.Element {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()

  const pendingStateEdits = useMapDataStore((s) => s.pendingStateEdits)
  const statesById = useMapDataStore((s) => s.statesById)
  const selectedStateId = useMapDataStore((s) => s.selectedStateId)
  const setSelectedStateId = useMapDataStore((s) => s.setSelectedStateId)
  const revertStateEdit = useMapDataStore((s) => s.revertStateEdit)

  const entries = [...pendingStateEdits.entries()]

  return (
    <div className={mergeClasses(styles.section, collapsed && styles.sectionCollapsed)}>
      <div className={styles.header} onClick={onToggleCollapse}>
        <Text size={100} weight="semibold" className={styles.title}>
          {t('statePanel.changes.title')}
        </Text>
        <Text size={100} className={mergeClasses(styles.count, entries.length > 0 && styles.countPending)}>
          {formatNumber(entries.length)}
        </Text>
        <div className={styles.headerSpacer} />
        {collapsed
          ? <ChevronDownRegular className={styles.chevron} />
          : <ChevronUpRegular className={styles.chevron} />}
      </div>

      {!collapsed && (
        entries.length === 0 ? (
          <Text size={200} className={styles.empty}>{t('statePanel.changes.empty')}</Text>
        ) : (
          <div className={styles.scroll}>
            <div className={styles.changeList}>
              {entries.map(([stateId, patch]) => {
                const state = statesById.get(stateId)
                const name = patch.name ?? state?.name ?? String(stateId)
                const fieldCount = Object.keys(patch).length
                const isSelected = stateId === selectedStateId

                return (
                  <div
                    key={stateId}
                    role="button"
                    tabIndex={0}
                    className={mergeClasses(styles.row, isSelected && styles.rowSelected)}
                    onClick={() => setSelectedStateId(stateId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedStateId(stateId)
                    }}
                  >
                    <Text size={100} className={styles.kindBadge}>edit</Text>
                    <Text size={100} className={styles.label}>{stateId}</Text>
                    <Text size={100} className={styles.rowSpacer} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </Text>
                    <Text size={100} className={styles.fieldCount}>
                      {t('statePanel.changes.fieldCount', { count: fieldCount })}
                    </Text>
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<DismissRegular />}
                      aria-label={t('provincePanel.changes.revert')}
                      onClick={(e) => {
                        e.stopPropagation()
                        revertStateEdit(stateId)
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
