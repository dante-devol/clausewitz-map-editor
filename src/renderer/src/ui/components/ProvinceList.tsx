import { useRef, useEffect, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  List,
  ListItem,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  makeStyles,
  mergeClasses,
  tokens,
  Text
} from '@fluentui/react-components'
import { ErrorCircleRegular, InfoRegular, WarningRegular } from '@fluentui/react-icons'
import { unpackColor } from '../../../../shared/mapDataTypes'
import type { ProvinceCatalogEntry } from '../../../../shared/provinceCatalog'
import { TYPE_COLORS, continentColor } from '../../infra/config/displayModes'
import { useI18n } from '../i18n/I18nProvider'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { useProvinceValidationStore } from '../../infra/store/provinceValidationStore'
import type { ProvinceValidationIssue } from '../../../../shared/provinceValidation'

const ROW_H = 36

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    flex: 1,
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0
  },
  count: {
    color: tokens.colorNeutralForeground3,
    padding: `0 ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`
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
    paddingRight: tokens.spacingHorizontalS,
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
  rowSelected: {
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
  issueCell: {
    width: '28px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0
  },
  issueChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    minWidth: '28px',
    height: '18px',
    padding: `0 ${tokens.spacingHorizontalXXS}`,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    cursor: 'pointer'
  },
  issueChipError: {
    border: `1px solid rgba(210, 78, 78, 0.32)`,
    backgroundColor: 'rgba(210, 78, 78, 0.12)',
    color: tokens.colorPaletteRedForeground1
  },
  issueChipWarning: {
    border: `1px solid rgba(181, 117, 0, 0.32)`,
    backgroundColor: 'rgba(181, 117, 0, 0.12)',
    color: tokens.colorPaletteDarkOrangeForeground1
  },
  issueChipInfo: {
    border: `1px solid rgba(0, 120, 212, 0.28)`,
    backgroundColor: 'rgba(0, 120, 212, 0.10)',
    color: tokens.colorBrandForeground1
  },
  issueChipIcon: {
    fontSize: '12px',
    lineHeight: 1
  },
  issueChipCount: {
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100
  },
  popover: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    maxWidth: '280px'
  },
  popoverHeader: {
    color: tokens.colorNeutralForeground2
  },
  issueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS
  },
  issueEntry: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusSmall,
    border: '1px solid transparent'
  },
  issueEntryError: {
    borderColor: 'rgba(210, 78, 78, 0.32)',
    backgroundColor: 'rgba(210, 78, 78, 0.08)',
    color: tokens.colorPaletteRedForeground1
  },
  issueEntryWarning: {
    borderColor: 'rgba(181, 117, 0, 0.32)',
    backgroundColor: 'rgba(181, 117, 0, 0.08)',
    color: tokens.colorPaletteDarkOrangeForeground1
  },
  issueEntryInfo: {
    borderColor: 'rgba(0, 120, 212, 0.28)',
    backgroundColor: 'rgba(0, 120, 212, 0.08)',
    color: tokens.colorBrandForeground1
  },
  issueEntryIcon: {
    flexShrink: 0,
    marginTop: '1px',
    fontSize: '12px',
    lineHeight: 1
  },
  issueEntryText: {
    flex: 1,
    minWidth: 0,
    whiteSpace: 'normal',
    color: tokens.colorNeutralForeground1
  },
  swatch: {
    width: '12px',
    height: '12px',
    borderRadius: tokens.borderRadiusCircular,
    border: `1px solid rgba(255,255,255,0.35)`,
    flexShrink: 0,
    marginRight: tokens.spacingHorizontalXS,
    boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground4}`
  },
  id: {
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
    width: '40px',
    textAlign: 'right',
    flexShrink: 0,
    color: tokens.colorNeutralForeground2,
    letterSpacing: '0.02em'
  },
  type: {
    width: '42px',
    flexShrink: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    padding: `2px ${tokens.spacingHorizontalXXS}`,
    borderRadius: tokens.borderRadiusSmall,
    border: '1px solid transparent',
    textAlign: 'center'
  },
  chip: {
    flexShrink: 0,
    maxWidth: '96px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: `2px ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusSmall,
    border: '1px solid transparent',
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100
  },
  terrain: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: tokens.colorNeutralForeground1,
    maxWidth: 'none'
  },
  empty: {
    padding: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center'
  }
})

interface Props {
  provinceCatalog: readonly ProvinceCatalogEntry[]
  selectedIds: number[]
  onSelect?: (id: number) => void
}

export function ProvinceList({ provinceCatalog, selectedIds, onSelect }: Props): JSX.Element {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const issuesByProvinceKey = useProvinceValidationStore((s) => s.issuesByProvinceKey)

  const sortedProvinces = useMemo(() => [...provinceCatalog], [provinceCatalog])

  const rowVirtualizer = useVirtualizer({
    count: sortedProvinces.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 12
  })

  // Set for O(1) per-row lookup.
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  // Scroll to the last touched province (tail of the array) after each selection change.
  const scrollTargetId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null
  const selectedIndex = useMemo(() => {
    if (scrollTargetId === null) return -1
    let lo = 0, hi = sortedProvinces.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const id = sortedProvinces[mid].id
      if (id === null) {
        hi = mid - 1
        continue
      }
      if (id === scrollTargetId) return mid
      if (id < scrollTargetId) lo = mid + 1
      else hi = mid - 1
    }
    return -1
  }, [scrollTargetId, sortedProvinces])

  useEffect(() => {
    if (selectedIndex < 0) return
    rowVirtualizer.scrollToIndex(selectedIndex, { align: 'center' })
  }, [selectedIndex, rowVirtualizer])

  const typeChipStyle = (type: ProvinceCatalogEntry['type']) => {
    if (!type) return undefined
    const hex = TYPE_COLORS[type] ?? '#808080'
    const { r, g, b } = hexToRgb(hex)
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.16)`,
      borderColor: `rgba(${r}, ${g}, ${b}, 0.36)`,
      color: `rgb(${lightenChannel(r)}, ${lightenChannel(g)}, ${lightenChannel(b)})`
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text size={100} weight="semibold">{t('provinceList.title')}</Text>
        <Text size={100} className={styles.count}>{formatNumber(sortedProvinces.length)}</Text>
      </div>

      {sortedProvinces.length === 0 ? (
        <Text size={200} className={styles.empty}>{t('provinceList.empty')}</Text>
      ) : (
        <div ref={scrollRef} className={styles.scroll}>
          <List as="div" className={styles.list}>
            <div className={styles.spacer} style={{ height: rowVirtualizer.getTotalSize() }}>
              {rowVirtualizer.getVirtualItems().map((item) => {
                const p = sortedProvinces[item.index]
                const isSelected = p.id !== null && selectedIdSet.has(p.id)
                const color = p.color ?? 0
                const { r, g, b } = unpackColor(color)
                const terrainColor = p.terrain ? terrains.get(p.terrain)?.color : undefined
                const terrainChipStyle = terrainColor !== undefined
                  ? makePackedChipStyle(terrainColor)
                  : undefined
                const continent = p.continent ? continents.get(p.continent) : undefined
                const continentChipStyle = continent !== undefined
                  ? makePackedChipStyle(continentColor(continent.position))
                  : undefined
                const issues = issuesByProvinceKey.get(p.key) ?? []
                const issueSeverityClassName = getIssueSeverityClassName(styles, issues)
                return (
                  <ListItem
                    as="div"
                    key={p.key}
                    className={mergeClasses(styles.row, isSelected && styles.rowSelected)}
                    style={{ top: item.start + 2, height: ROW_H - 4 }}
                    onClick={() => {
                      if (p.id !== null) onSelect?.(p.id)
                    }}
                  >
                    <div className={styles.issueCell}>
                      {issues.length > 0 && (
                        <Popover positioning="after-top" withArrow>
                          <PopoverTrigger disableButtonEnhancement>
                            <div
                              role="button"
                              tabIndex={0}
                              className={mergeClasses(styles.issueChip, issueSeverityClassName)}
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
                              }}
                              aria-label={`Show issues for province ${formatProvinceId(p)}`}
                            >
                              <WarningRegular className={styles.issueChipIcon} />
                              <Text as="span" className={styles.issueChipCount}>
                                {issues.length}
                              </Text>
                            </div>
                          </PopoverTrigger>
                          <PopoverSurface onClick={(event) => event.stopPropagation()}>
                            <div className={styles.popover}>
                              <Text size={100} weight="semibold">
                                Province {formatProvinceId(p)}
                              </Text>
                              <Text size={100} className={styles.popoverHeader}>
                                {issues.length} issue{issues.length === 1 ? '' : 's'}
                              </Text>
                              <div className={styles.issueList}>
                                {issues.map((issue, index) => (
                                  <div
                                    key={`${issue.code}:${index}`}
                                    className={mergeClasses(
                                      styles.issueEntry,
                                      getIssueEntrySeverityClassName(styles, issue)
                                    )}
                                  >
                                    {renderSeverityIcon(issue.severity, styles.issueEntryIcon)}
                                    <Text size={100} className={styles.issueEntryText}>
                                      {issue.message}
                                    </Text>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverSurface>
                        </Popover>
                      )}
                    </div>
                    <div
                      className={styles.swatch}
                      style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                    />
                    <Text size={100} className={styles.id}>{formatProvinceId(p)}</Text>
                    <Text size={100} className={styles.type} style={typeChipStyle(p.type)}>
                      {p.type ?? '—'}
                    </Text>
                    <Text
                      size={100}
                      className={mergeClasses(styles.chip, styles.terrain)}
                      style={terrainChipStyle}
                    >
                      {p.terrain ?? '—'}
                    </Text>
                    {continent && (
                      <Text
                        size={100}
                        className={styles.chip}
                        style={continentChipStyle}
                      >
                        {continent.codeName}
                      </Text>
                    )}
                  </ListItem>
                )
              })}
            </div>
          </List>
        </div>
      )}
    </div>
  )
}

function formatProvinceId(province: ProvinceCatalogEntry): string {
  return province.id === null ? 'xxxxx' : String(province.id)
}

function getIssueSeverityClassName(
  styles: ReturnType<typeof useStyles>,
  issues: ProvinceValidationIssue[]
): string {
  if (issues.some((issue) => issue.severity === 'error')) return styles.issueChipError
  if (issues.some((issue) => issue.severity === 'warning')) return styles.issueChipWarning
  return styles.issueChipInfo
}

function getIssueEntrySeverityClassName(
  styles: ReturnType<typeof useStyles>,
  issue: ProvinceValidationIssue
): string {
  if (issue.severity === 'error') return styles.issueEntryError
  if (issue.severity === 'warning') return styles.issueEntryWarning
  return styles.issueEntryInfo
}

function renderSeverityIcon(
  severity: ProvinceValidationIssue['severity'],
  className: string
): JSX.Element {
  if (severity === 'error') return <ErrorCircleRegular className={className} />
  if (severity === 'warning') return <WarningRegular className={className} />
  return <InfoRegular className={className} />
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '')
  const value = parseInt(normalized, 16)
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff
  }
}

function makePackedChipStyle(color: number): {
  backgroundColor: string
  borderColor: string
  color: string
} {
  const { r, g, b } = unpackColor(color)
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.14)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.3)`,
    color: `rgb(${lightenChannel(r)}, ${lightenChannel(g)}, ${lightenChannel(b)})`
  }
}

function lightenChannel(value: number): number {
  return Math.min(255, Math.round(value * 0.7 + 76))
}
