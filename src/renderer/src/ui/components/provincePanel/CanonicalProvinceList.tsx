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
  Text,
  shorthands
} from '@fluentui/react-components'
import {
  ChevronDownRegular,
  ChevronUpRegular,
  ErrorCircleRegular,
  InfoRegular,
  WarningRegular
} from '@fluentui/react-icons'
import { unpackColor } from '../../../../../shared/mapDataTypes'
import type { ProvinceCatalogEntry } from '../../../../../shared/provinceCatalog'
import { TYPE_COLORS, continentColor } from '../../../infra/config/displayModes'
import { useI18n } from '../../i18n/I18nProvider'
import type { MessageKey } from '../../i18n/messages/en'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { useProvinceValidationStore } from '../../../infra/store/provinceValidationStore'
import { useCrossSelection } from './useCrossSelection'
import { EntitySearchBar } from '../entityPanel/EntitySearchBar'
import { useEntitySearch, type EntitySearchConfig } from '../entityPanel/entitySearch'
import type { ProvinceValidationIssue } from '../../../../../shared/provinceValidation'

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
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS
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
  rowEdited: {
    '&::before': {
      backgroundColor: tokens.colorPaletteGoldForeground2
    }
  },
  rowCrossSelected: {
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke1}`
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
    ...shorthands.borderColor('rgba(210, 78, 78, 0.32)'),
    backgroundColor: 'rgba(210, 78, 78, 0.12)',
    color: tokens.colorPaletteRedForeground1
  },
  issueChipWarning: {
    ...shorthands.borderColor('rgba(181, 117, 0, 0.32)'),
    backgroundColor: 'rgba(181, 117, 0, 0.12)',
    color: tokens.colorPaletteDarkOrangeForeground1
  },
  issueChipInfo: {
    ...shorthands.borderColor('rgba(0, 120, 212, 0.28)'),
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
    ...shorthands.borderColor('rgba(210, 78, 78, 0.32)'),
    backgroundColor: 'rgba(210, 78, 78, 0.08)',
    color: tokens.colorPaletteRedForeground1
  },
  issueEntryWarning: {
    ...shorthands.borderColor('rgba(181, 117, 0, 0.32)'),
    backgroundColor: 'rgba(181, 117, 0, 0.08)',
    color: tokens.colorPaletteDarkOrangeForeground1
  },
  issueEntryInfo: {
    ...shorthands.borderColor('rgba(0, 120, 212, 0.28)'),
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
  swatchGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    flexShrink: 0,
    marginRight: tokens.spacingHorizontalXS
  },
  swatch: {
    width: '12px',
    height: '12px',
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.borderColor('rgba(255,255,255,0.35)'),
    flexShrink: 0,
    boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground4}`
  },
  swatchOrig: {
    width: '8px',
    height: '8px',
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.borderColor('rgba(255,255,255,0.2)'),
    flexShrink: 0,
    opacity: 0.5,
    boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground4}`
  },
  swatchArrow: {
    fontSize: '9px',
    color: tokens.colorNeutralForeground3,
    lineHeight: '1'
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
  collapsed: boolean
  onToggleCollapse: () => void
}

export function CanonicalProvinceList({ collapsed, onToggleCollapse }: Props): JSX.Element {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastClickedIndexRef = useRef<number | null>(null)

  const provinceCatalog = useMapDataStore((s) => s.provinceCatalog)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const pendingEdits = useMapDataStore((s) => s.pendingEdits)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)
  const selectedProvinceIds = useMapDataStore((s) => s.selectedProvinceIds)
  const setSelection = useMapDataStore((s) => s.setSelection)
  const extendSelection = useMapDataStore((s) => s.extendSelection)
  const toggleProvinceId = useMapDataStore((s) => s.toggleProvinceId)
  const { crossSelectedProvinceIds } = useCrossSelection()

  const bmpOnlyByGuid = useMemo(
    () => new Map(bmpOnlyEntries.map((e) => [e.guid, e])),
    [bmpOnlyEntries]
  )
  const issuesByProvinceKey = useProvinceValidationStore((s) => s.issuesByProvinceKey)

  const canonicalProvinces = useMemo(
    () => provinceCatalog.filter((e) => e.canonical),
    [provinceCatalog]
  )

  const searchConfig = useMemo<EntitySearchConfig<ProvinceCatalogEntry>>(() => ({
    freeTextValues: (p) => [
      ...(p.id !== null ? [String(p.id)] : []),
      ...(p.type ? [p.type.toLowerCase()] : []),
      ...(p.terrain ? [p.terrain.toLowerCase()] : []),
      ...(p.continent ? [p.continent.toLowerCase()] : []),
      ...(p.isCoastal === true ? ['coastal'] : p.isCoastal === false ? ['inland'] : [])
    ],
    fields: [
      { key: 'type', label: t('entitySearch.field.type'), getValues: (p) => (p.type ? [p.type.toLowerCase()] : []) },
      { key: 'terrain', label: t('entitySearch.field.terrain'), getValues: (p) => (p.terrain ? [p.terrain.toLowerCase()] : []) },
      { key: 'continent', label: t('entitySearch.field.continent'), getValues: (p) => (p.continent ? [p.continent.toLowerCase()] : []) },
      {
        key: 'coastal',
        label: t('entitySearch.field.coastal'),
        knownValues: ['coastal', 'inland'],
        getValues: (p) => (p.isCoastal === true ? ['coastal'] : p.isCoastal === false ? ['inland'] : []),
        formatLabel: (value) => (value === 'coastal' ? t('entitySearch.value.coastalOnly') : t('entitySearch.value.inlandOnly'))
      },
      {
        key: 'severity',
        label: t('entitySearch.field.severity'),
        knownValues: ['error', 'warning', 'info'],
        getValues: (p) => (issuesByProvinceKey.get(p.key) ?? []).map((issue) => issue.severity),
        formatValue: (value) => value.charAt(0).toUpperCase() + value.slice(1)
      },
      {
        key: 'hasIssues',
        label: t('entitySearch.field.hasIssues'),
        knownValues: ['issues'],
        getValues: (p) => ((issuesByProvinceKey.get(p.key) ?? []).length > 0 ? ['issues'] : []),
        formatLabel: () => t('entitySearch.value.hasIssues')
      }
    ]
  }), [t, issuesByProvinceKey])

  const search = useEntitySearch(canonicalProvinces, searchConfig)
  const filteredProvinces = search.filteredItems
  const hasActiveFilters = search.chips.length > 0

  const rowVirtualizer = useVirtualizer({
    count: filteredProvinces.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 12
  })

  const selectedIdSet = useMemo(() => new Set(selectedProvinceIds), [selectedProvinceIds])
  const crossSelectedIdSet = useMemo(() => new Set(crossSelectedProvinceIds), [crossSelectedProvinceIds])

  const scrollTargetId = selectedProvinceIds.length > 0 ? selectedProvinceIds[selectedProvinceIds.length - 1] : null
  const selectedIndex = useMemo(() => {
    if (scrollTargetId === null) return -1
    return filteredProvinces.findIndex((p) => p.id === scrollTargetId)
  }, [filteredProvinces, scrollTargetId])

  useEffect(() => {
    if (selectedIndex < 0) return
    rowVirtualizer.scrollToIndex(selectedIndex, { align: 'center' })
  }, [selectedIndex, rowVirtualizer])

  const handleRowClick = (p: ProvinceCatalogEntry, index: number, e: React.MouseEvent) => {
    if (p.id === null) return
    if (e.shiftKey) {
      e.preventDefault()
      if (lastClickedIndexRef.current === null) {
        setSelection([p.id])
        lastClickedIndexRef.current = index
      } else {
        const start = Math.min(lastClickedIndexRef.current, index)
        const end = Math.max(lastClickedIndexRef.current, index)
        const rangeIds = filteredProvinces.slice(start, end + 1)
          .map((rp) => rp.id)
          .filter((id): id is number => id !== null)
        setSelection(rangeIds)
        // Anchor stays fixed
      }
    } else if (e.ctrlKey || e.metaKey) {
      toggleProvinceId(p.id)
      lastClickedIndexRef.current = index
    } else {
      setSelection([p.id])
      lastClickedIndexRef.current = index
    }
  }

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
    <div className={mergeClasses(styles.section, collapsed && styles.sectionCollapsed)}>
      <div className={styles.header} onClick={onToggleCollapse}>
        <Text size={100} weight="semibold" className={styles.title}>
          {t('provincePanel.canonical.title')}
        </Text>
        <Text size={100} className={styles.count}>
          {(hasActiveFilters || search.query.trim().length > 0)
            ? `${formatNumber(filteredProvinces.length)} / ${formatNumber(canonicalProvinces.length)}`
            : formatNumber(canonicalProvinces.length)}
        </Text>
        <div className={styles.headerSpacer} />
        <div className={styles.headerActions}>
          {collapsed
            ? <ChevronDownRegular className={styles.chevron} />
            : <ChevronUpRegular className={styles.chevron} />}
        </div>
      </div>

      {!collapsed && (
        <EntitySearchBar
          query={search.query}
          onQueryChange={search.setQuery}
          chips={search.chips}
          onRemoveChip={search.removeChip}
          suggestions={search.suggestions}
          onApplySuggestion={search.addChip}
          placeholder={t('provinceList.search.placeholder')}
          removeChipLabel={t('entitySearch.removeFilter')}
        />
      )}

      {!collapsed && (
        canonicalProvinces.length === 0 ? (
          <Text size={200} className={styles.empty}>{t('provinceList.empty')}</Text>
        ) : filteredProvinces.length === 0 ? (
          <Text size={200} className={styles.empty}>{t('entitySearch.noResults')}</Text>
        ) : (
          <div ref={scrollRef} className={styles.scroll}>
            <List as="div" className={styles.list}>
              <div className={styles.spacer} style={{ height: rowVirtualizer.getTotalSize() }}>
                {rowVirtualizer.getVirtualItems().map((item) => {
                  const p = filteredProvinces[item.index]
                  const isSelected = p.id !== null && selectedIdSet.has(p.id)
                  const isCrossSelected = p.id !== null && crossSelectedIdSet.has(p.id) && !isSelected
                  const isEdited = p.id !== null && (pendingEdits.has(p.id) || bmpReplacements.has(p.id))

                  // Compute effective values: original + field patch + BMP replacement color
                  const originalDef = p.id !== null ? originalDefinitions.get(p.id) : undefined
                  const patch = p.id !== null ? (pendingEdits.get(p.id) ?? {}) : {}
                  const replacingGuid = p.id !== null ? bmpReplacements.get(p.id) : undefined
                  const bmpEntry = replacingGuid ? bmpOnlyByGuid.get(replacingGuid) : undefined
                  const baseDef = originalDef ?? p
                  const display = { ...baseDef, ...patch, ...(bmpEntry ? { color: bmpEntry.color } : {}) }
                  const color = display.color ?? 0
                  const { r, g, b } = unpackColor(color)
                  const colorReplaced = bmpEntry !== undefined
                  const origColor = colorReplaced ? unpackColor(baseDef.color ?? 0) : null
                  const terrainColor = display.terrain ? terrains.get(display.terrain)?.color : undefined
                  const terrainChipStyle = terrainColor !== undefined
                    ? makePackedChipStyle(terrainColor)
                    : undefined
                  const continent = display.continent ? continents.get(display.continent) : undefined
                  const continentChipStyle = continent !== undefined
                    ? makePackedChipStyle(continentColor(continent.position))
                    : undefined
                  const issues = issuesByProvinceKey.get(p.key) ?? []
                  const issueSeverityClassName = getIssueSeverityClassName(styles, issues)

                  return (
                    <ListItem
                      as="div"
                      key={p.key}
                      className={mergeClasses(
                        styles.row,
                        isEdited && styles.rowEdited,
                        isCrossSelected && styles.rowCrossSelected,
                        isSelected && styles.rowSelected
                      )}
                      style={{ top: item.start + 2, height: ROW_H - 4 }}
                      onClick={(e) => handleRowClick(p, item.index, e)}
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
                                aria-label={t('provinceList.issue.ariaLabel', {
                                  id: p.id !== null ? String(p.id) : '?'
                                })}
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
                                  {t('provinceList.issue.title', { id: p.id !== null ? String(p.id) : '?' })}
                                </Text>
                                <Text size={100} className={styles.popoverHeader}>
                                  {t('provinceList.issue.count', { count: issues.length })}
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
                                        {t(issue.code as MessageKey, issue.messageParams)}
                                      </Text>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PopoverSurface>
                          </Popover>
                        )}
                      </div>
                      <div className={styles.swatchGroup}>
                        {colorReplaced && origColor && (
                          <>
                            <div
                              className={styles.swatchOrig}
                              style={{ backgroundColor: `rgb(${origColor.r},${origColor.g},${origColor.b})` }}
                            />
                            <span className={styles.swatchArrow}>→</span>
                          </>
                        )}
                        <div
                          className={styles.swatch}
                          style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                        />
                      </div>
                      <Text size={100} className={styles.id}>
                        {p.id !== null ? String(p.id) : '—'}
                      </Text>
                      <Text size={100} className={styles.type} style={typeChipStyle(display.type ?? null)}>
                        {display.type ?? '—'}
                      </Text>
                      <Text
                        size={100}
                        className={mergeClasses(styles.chip, styles.terrain)}
                        style={terrainChipStyle}
                      >
                        {display.terrain ?? '—'}
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
        )
      )}
    </div>
  )
}

function getIssueSeverityClassName(styles: ReturnType<typeof useStyles>, issues: ProvinceValidationIssue[]): string {
  if (issues.some((i) => i.severity === 'error')) return styles.issueChipError
  if (issues.some((i) => i.severity === 'warning')) return styles.issueChipWarning
  return styles.issueChipInfo
}

function getIssueEntrySeverityClassName(styles: ReturnType<typeof useStyles>, issue: ProvinceValidationIssue): string {
  if (issue.severity === 'error') return styles.issueEntryError
  if (issue.severity === 'warning') return styles.issueEntryWarning
  return styles.issueEntryInfo
}

function renderSeverityIcon(severity: ProvinceValidationIssue['severity'], className: string): JSX.Element {
  if (severity === 'error') return <ErrorCircleRegular className={className} />
  if (severity === 'warning') return <WarningRegular className={className} />
  return <InfoRegular className={className} />
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '')
  const value = parseInt(normalized, 16)
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff }
}

function makePackedChipStyle(color: number): { backgroundColor: string; borderColor: string; color: string } {
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
