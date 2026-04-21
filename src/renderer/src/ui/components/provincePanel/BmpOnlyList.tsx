import { useRef, useState, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Button,
  List,
  ListItem,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  shorthands
} from '@fluentui/react-components'
import { ChevronDownRegular, ChevronUpRegular } from '@fluentui/react-icons'
import { unpackColor } from '../../../../../shared/mapDataTypes'
import type { BmpAssignment, BmpOnlyEntry } from '../../../../../shared/provinceEditing'
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { BmpAssignPopover } from './BmpAssignPopover'
import { useCrossSelection } from './useCrossSelection'

const ROW_H = 36

const useStyles = makeStyles({
  section: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'hidden',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`
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
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    userSelect: 'none'
  },
  list: {
    position: 'relative',
    minHeight: '100%',
    margin: 0,
    padding: 0,
    listStyleType: 'none'
  },
  spacer: {
    position: 'relative',
    width: '100%'
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    minWidth: 0,
    overflow: 'hidden',
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalXXS,
    cursor: 'pointer',
    boxSizing: 'border-box',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorTransparentStroke}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    transitionProperty: 'background-color, border-color, box-shadow, transform',
    transitionDuration: tokens.durationNormal,
    transitionTimingFunction: tokens.curveEasyEase,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground2,
      border: `1px solid ${tokens.colorNeutralStroke2}`,
      transform: 'translateY(-1px)'
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '7px',
      bottom: '7px',
      width: '2px',
      borderRadius: tokens.borderRadiusCircular,
      backgroundColor: 'transparent'
    }
  },
  rowAddressed: {
    '&::before': {
      backgroundColor: tokens.colorPaletteGreenForeground1
    }
  },
  rowCrossSelected: {
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke1}`
  },
  rowMultiSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke1}`,
    boxShadow: tokens.shadow4,
    '&:hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      border: `1px solid ${tokens.colorBrandStroke1}`
    },
    '&::before': {
      backgroundColor: tokens.colorBrandForeground1
    }
  },
  swatch: {
    width: '12px',
    height: '12px',
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.borderColor('rgba(255,255,255,0.35)'),
    flexShrink: 0,
    boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground4}`
  },
  guid: {
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
    letterSpacing: '0.02em',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  rowSpacer: {
    flex: 1,
    minWidth: 0
  },
  assignedBadge: {
    padding: `2px ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    ...shorthands.borderColor('rgba(55, 145, 80, 0.32)'),
    backgroundColor: 'rgba(55, 145, 80, 0.12)',
    color: tokens.colorPaletteGreenForeground1,
    flexShrink: 0,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'rgba(55, 145, 80, 0.2)'
    }
  },
  popoverSurface: {
    padding: tokens.spacingHorizontalM
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

export function BmpOnlyList({ collapsed, onToggleCollapse }: Props): JSX.Element {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastSelectedIndexRef = useRef<number | null>(null)

  const entries = useMapDataStore((s) => s.bmpOnlyEntries)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const pendingNewProvinces = useMapDataStore((s) => s.pendingNewProvinces)
  const selectedBmpGuids = useMapDataStore((s) => s.selectedBmpGuids)
  const setSelectedBmpGuids = useMapDataStore((s) => s.setSelectedBmpGuids)
  const setSelection = useMapDataStore((s) => s.setSelection)
  const { crossSelectedBmpGuids } = useCrossSelection()

  const bmpAssignments = useMemo(() => {
    const map = new Map<string, BmpAssignment>()
    for (const [provinceId, guid] of bmpReplacements) {
      map.set(guid, { kind: 'replace', targetId: provinceId })
    }
    for (const [guid, assignedId] of pendingNewProvinces) {
      map.set(guid, { kind: 'register', assignedId })
    }
    return map
  }, [bmpReplacements, pendingNewProvinces])

  const [openGuid, setOpenGuid] = useState<string | null>(null)
  const [multiPopoverOpen, setMultiPopoverOpen] = useState(false)

  const unresolvedCount = entries.filter((e) => !bmpAssignments.has(e.guid)).length
  const selectedSet = new Set(selectedBmpGuids)
  const crossSelectedSet = new Set(crossSelectedBmpGuids)

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 8
  })

  const clearSelection = () => {
    setSelectedBmpGuids([])
    lastSelectedIndexRef.current = null
  }

  const selectEntry = (entry: BmpOnlyEntry, index: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault()
      if (lastSelectedIndexRef.current === null) {
        setSelectedBmpGuids([entry.guid])
        setSelection([])
        lastSelectedIndexRef.current = index
      } else {
        const start = Math.min(lastSelectedIndexRef.current, index)
        const end = Math.max(lastSelectedIndexRef.current, index)
        const rangeGuids = entries.slice(start, end + 1).map((en) => en.guid)
        setSelectedBmpGuids(rangeGuids)
        setSelection([])
        // Anchor stays fixed; do not update lastSelectedIndexRef
      }
    } else {
      setSelectedBmpGuids([entry.guid])
      setSelection([])
      lastSelectedIndexRef.current = index
    }
  }

  const handleActionClick = (entry: BmpOnlyEntry, index: number, e: React.MouseEvent) => {
    selectEntry(entry, index, e)
    e.stopPropagation()
  }

  return (
    <div className={mergeClasses(styles.section, collapsed && styles.sectionCollapsed)}>
      <div className={styles.header} onClick={onToggleCollapse}>
        <Text size={100} weight="semibold" className={styles.title}>
          {t('provincePanel.bmpOnly.title')}
        </Text>
        <Text size={100} className={styles.count}>
          {unresolvedCount < entries.length
            ? `${formatNumber(unresolvedCount)}/${formatNumber(entries.length)}`
            : formatNumber(entries.length)}
        </Text>
        <div className={styles.headerSpacer} />

        {selectedBmpGuids.length > 0 && (
          <Popover
            positioning="below-end"
            withArrow
            open={multiPopoverOpen}
            onOpenChange={(_, data) => {
              setMultiPopoverOpen(data.open)
              if (!data.open) clearSelection()
            }}
          >
            <PopoverTrigger disableButtonEnhancement>
              <Button
                size="small"
                appearance="primary"
                onClick={(e) => {
                  e.stopPropagation()
                  setMultiPopoverOpen(true)
                }}
              >
                {t('bmpAssign.resolveN', { count: selectedBmpGuids.length })}
              </Button>
            </PopoverTrigger>
            <PopoverSurface className={styles.popoverSurface}>
              <BmpAssignPopover
                selectedGuids={selectedBmpGuids}
                onDismiss={() => {
                  setMultiPopoverOpen(false)
                  clearSelection()
                }}
              />
            </PopoverSurface>
          </Popover>
        )}

        {collapsed
          ? <ChevronDownRegular className={styles.chevron} />
          : <ChevronUpRegular className={styles.chevron} />}
      </div>

      {!collapsed && (
        entries.length === 0 ? (
          <Text size={200} className={styles.empty}>{t('provincePanel.bmpOnly.empty')}</Text>
        ) : (
          <div ref={scrollRef} className={styles.scroll}>
            <List as="div" className={styles.list}>
              <div className={styles.spacer} style={{ height: rowVirtualizer.getTotalSize() }}>
                {rowVirtualizer.getVirtualItems().map((item) => {
                  const entry = entries[item.index]
                  const action = bmpAssignments.get(entry.guid)
                  const isAddressed = action !== undefined
                  const isMultiSelected = selectedSet.has(entry.guid)
                  const isCrossSelected = crossSelectedSet.has(entry.guid) && !isMultiSelected

                  const { r, g, b } = unpackColor(entry.color)

                  return (
                    <ListItem
                      as="div"
                      key={entry.guid}
                      className={mergeClasses(
                        styles.row,
                        isAddressed && styles.rowAddressed,
                        isCrossSelected && styles.rowCrossSelected,
                        isMultiSelected && styles.rowMultiSelected
                      )}
                      style={{ top: item.start + 2, height: ROW_H - 4 }}
                      onClick={(e) => selectEntry(entry, item.index, e)}
                    >
                      <div
                        className={styles.swatch}
                        style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                      />
                      <Text size={100} className={styles.guid}>{entry.guid}</Text>
                      <div className={styles.rowSpacer} />

                      <Popover
                        positioning="before-top"
                        withArrow
                        open={openGuid === entry.guid}
                        onOpenChange={(_, data) => setOpenGuid(data.open ? entry.guid : null)}
                      >
                        <PopoverTrigger disableButtonEnhancement>
                          {isAddressed ? (
                            <Text
                              size={100}
                              className={styles.assignedBadge}
                              onClick={(e) => handleActionClick(entry, item.index, e)}
                            >
                              {action.kind === 'replace'
                                ? t('provincePanel.changes.replace', { id: action.targetId })
                                : t('provincePanel.changes.register', { id: action.assignedId })}
                            </Text>
                          ) : (
                            <Button
                              size="small"
                              appearance="subtle"
                              onClick={(e) => handleActionClick(entry, item.index, e)}
                            >
                              {t('bmpAssign.trigger.unassigned')}
                            </Button>
                          )}
                        </PopoverTrigger>
                        <PopoverSurface className={styles.popoverSurface}>
                          <BmpAssignPopover
                            guid={entry.guid}
                            onDismiss={() => setOpenGuid(null)}
                          />
                        </PopoverSurface>
                      </Popover>
                    </ListItem>
                  )
                })}
              </div>
            </List>
          </div>
        )
      )}
    </div>
  )
}
