import { useRef, useEffect, useMemo, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Button,
  Input,
  List,
  ListItem,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Tag,
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
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { useProvinceValidationStore } from '../../../infra/store/provinceValidationStore'
import type { ProvinceValidationIssue, ProvinceValidationSeverity } from '../../../../../shared/provinceValidation'
import type { SelectionOrigin } from '../../../../../shared/provinceEditing'

const ROW_H = 36
const SUGGESTION_LIMIT = 8

type CoastalFilter = 'all' | 'coastal' | 'inland'
type ValidationFilter = 'all' | 'clean' | 'any'

interface ProvinceListFilters {
  types: string[]
  terrains: string[]
  continents: string[]
  coastal: CoastalFilter
  validation: ValidationFilter
  severities: ProvinceValidationSeverity[]
}

interface FilterSuggestion {
  key: string
  kind: 'type' | 'terrain' | 'continent' | 'coastal' | 'validation' | 'severity'
  value: string
  label: string
  groupLabel: string
}

const EMPTY_FILTERS: ProvinceListFilters = {
  types: [],
  terrains: [],
  continents: [],
  coastal: 'all',
  validation: 'all',
  severities: []
}

const VALIDATION_SEVERITIES: ProvinceValidationSeverity[] = ['error', 'warning', 'info']

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
  filterButtonActive: {
    ...shorthands.borderColor(tokens.colorBrandStroke1),
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1
  },
  filterSurface: {
    width: '340px',
    maxWidth: 'min(340px, calc(100vw - 24px))',
    padding: tokens.spacingHorizontalS
  },
  filterPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS
  },
  filterHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS
  },
  filterSummary: {
    color: tokens.colorNeutralForeground3
  },
  combobox: {
    width: '100%'
  },
  helperText: {
    color: tokens.colorNeutralForeground3
  },
  suggestionList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXXS
  },
  suggestionButton: {
    minWidth: 0,
    maxWidth: '100%'
  },
  activeFilters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXXS
  },
  activeTag: {
    maxWidth: '100%'
  },
  suggestionHint: {
    color: tokens.colorNeutralForeground3
  },
  filterFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXS,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`
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
  provinceCatalog: readonly ProvinceCatalogEntry[]
  selectedIds: number[]
  crossSelectedId: number | undefined
  onSelect?: (id: number) => void
  onCrossSelect?: (origin: SelectionOrigin) => void
}

export function CanonicalProvinceList({
  collapsed,
  onToggleCollapse,
  provinceCatalog,
  selectedIds,
  crossSelectedId,
  onSelect,
  onCrossSelect
}: Props): JSX.Element {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const pendingEdits = useMapDataStore((s) => s.pendingEdits)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)

  const bmpOnlyByGuid = useMemo(
    () => new Map(bmpOnlyEntries.map((e) => [e.guid, e])),
    [bmpOnlyEntries]
  )
  const issuesByProvinceKey = useProvinceValidationStore((s) => s.issuesByProvinceKey)
  const [filters, setFilters] = useState<ProvinceListFilters>(EMPTY_FILTERS)
  const [filterQuery, setFilterQuery] = useState('')

  const canonicalProvinces = useMemo(
    () => provinceCatalog.filter((e) => e.canonical),
    [provinceCatalog]
  )

  const hasActiveFilters = useMemo(() => !areFiltersEmpty(filters), [filters])

  const filterSuggestions = useMemo(
    () => buildFilterSuggestions(canonicalProvinces, filters, t),
    [filters, canonicalProvinces, t]
  )

  const visibleSuggestions = useMemo(
    () => filterSuggestionsForQuery(filterSuggestions, filterQuery),
    [filterQuery, filterSuggestions]
  )

  const activeFilterTags = useMemo(
    () => buildActiveFilterTags(filters, t),
    [filters, t]
  )

  const filteredProvinces = useMemo(() => (
    canonicalProvinces.filter((p) => matchesProvinceFilters(p, filters, issuesByProvinceKey))
  ), [filters, issuesByProvinceKey, canonicalProvinces])

  const rowVirtualizer = useVirtualizer({
    count: filteredProvinces.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 12
  })

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const scrollTargetId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null
  const selectedIndex = useMemo(() => {
    if (scrollTargetId === null) return -1
    return filteredProvinces.findIndex((p) => p.id === scrollTargetId)
  }, [filteredProvinces, scrollTargetId])

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

  const applySuggestion = (suggestionKey: string | null) => {
    if (!suggestionKey) return
    const suggestion = filterSuggestions.find((c) => c.key === suggestionKey)
    if (!suggestion) return
    setFilters((current) => applyFilterSuggestion(current, suggestion))
    setFilterQuery('')
  }

  return (
    <div className={mergeClasses(styles.section, collapsed && styles.sectionCollapsed)}>
      <div className={styles.header} onClick={onToggleCollapse}>
        <Text size={100} weight="semibold" className={styles.title}>
          {t('provincePanel.canonical.title')}
        </Text>
        <Text size={100} className={styles.count}>
          {hasActiveFilters
            ? `${formatNumber(filteredProvinces.length)} / ${formatNumber(canonicalProvinces.length)}`
            : formatNumber(canonicalProvinces.length)}
        </Text>
        <div className={styles.headerSpacer} />
        <div className={styles.headerActions}>
          {!collapsed && (
            <Popover positioning="below-end" withArrow>
              <PopoverTrigger disableButtonEnhancement>
                <Button
                  size="small"
                  appearance="subtle"
                  className={mergeClasses(hasActiveFilters && styles.filterButtonActive)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('provinceList.filter.button')}
                </Button>
              </PopoverTrigger>
              <PopoverSurface className={styles.filterSurface}>
                <div className={styles.filterPanel}>
                  <div className={styles.filterHeader}>
                    <Text size={100} className={styles.filterSummary}>
                      {t('provinceList.filter.summary', {
                        count: formatNumber(filteredProvinces.length)
                      })}
                    </Text>
                    <Button
                      size="small"
                      appearance="subtle"
                      disabled={!hasActiveFilters}
                      onClick={() => {
                        setFilters(EMPTY_FILTERS)
                        setFilterQuery('')
                      }}
                    >
                      {t('provinceList.filter.clear')}
                    </Button>
                  </div>

                  <Input
                    size="small"
                    className={styles.combobox}
                    appearance="outline"
                    placeholder={t('provinceList.filter.placeholder')}
                    value={filterQuery}
                    onChange={(_, data) => setFilterQuery(data.value)}
                  />

                  <Text size={100} className={styles.helperText}>
                    {t('provinceList.filter.helper')}
                  </Text>

                  {visibleSuggestions.length > 0 && (
                    <div className={styles.suggestionList}>
                      {visibleSuggestions.map((suggestion) => (
                        <Button
                          key={suggestion.key}
                          size="small"
                          appearance="subtle"
                          className={styles.suggestionButton}
                          onClick={() => applySuggestion(suggestion.key)}
                        >
                          {`${suggestion.groupLabel}: ${suggestion.label}`}
                        </Button>
                      ))}
                    </div>
                  )}

                  {activeFilterTags.length > 0 ? (
                    <div className={styles.activeFilters}>
                      {activeFilterTags.map((tag) => (
                        <Tag
                          key={tag.key}
                          dismissible
                          className={styles.activeTag}
                          dismissIcon={{ 'aria-label': t('provinceList.filter.remove') }}
                          onDismiss={() => setFilters((current) => removeFilterTag(current, tag.key))}
                        >
                          {tag.label}
                        </Tag>
                      ))}
                    </div>
                  ) : (
                    <Text size={100} className={styles.suggestionHint}>
                      {t('provinceList.filter.emptySelection')}
                    </Text>
                  )}

                  <div className={styles.filterFooter}>
                    <Text size={100} className={styles.filterSummary}>
                      {filterQuery.trim().length > 0
                        ? t('provinceList.filter.matches', { count: formatNumber(visibleSuggestions.length) })
                        : t('provinceList.filter.suggested')}
                    </Text>
                  </div>
                </div>
              </PopoverSurface>
            </Popover>
          )}
          {collapsed
            ? <ChevronDownRegular className={styles.chevron} />
            : <ChevronUpRegular className={styles.chevron} />}
        </div>
      </div>

      {!collapsed && (
        canonicalProvinces.length === 0 ? (
          <Text size={200} className={styles.empty}>{t('provinceList.empty')}</Text>
        ) : filteredProvinces.length === 0 ? (
          <Text size={200} className={styles.empty}>{t('provinceList.filter.empty')}</Text>
        ) : (
          <div ref={scrollRef} className={styles.scroll}>
            <List as="div" className={styles.list}>
              <div className={styles.spacer} style={{ height: rowVirtualizer.getTotalSize() }}>
                {rowVirtualizer.getVirtualItems().map((item) => {
                  const p = filteredProvinces[item.index]
                  const isSelected = p.id !== null && selectedIdSet.has(p.id)
                  const isCrossSelected = p.id !== null && p.id === crossSelectedId && !isSelected
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
                      onClick={() => {
                        if (p.id !== null) {
                          onSelect?.(p.id)
                          onCrossSelect?.({ list: 'canonical', provinceId: p.id })
                        }
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
                      <Text size={100} className={styles.type} style={typeChipStyle(display.type)}>
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

function uniqueSorted(values: Array<string | null>): string[] {
  return [...new Set(values.filter((v): v is string => v !== null && v.length > 0))].sort()
}

function areFiltersEmpty(filters: ProvinceListFilters): boolean {
  return filters.types.length === 0
    && filters.terrains.length === 0
    && filters.continents.length === 0
    && filters.coastal === 'all'
    && filters.validation === 'all'
    && filters.severities.length === 0
}

function toggleFilterValue<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((c) => c !== value)
    : [...values, value]
}

function matchesProvinceFilters(
  province: ProvinceCatalogEntry,
  filters: ProvinceListFilters,
  issuesByProvinceKey: Map<string, ProvinceValidationIssue[]>
): boolean {
  if (filters.types.length > 0 && (!province.type || !filters.types.includes(province.type))) return false
  if (filters.terrains.length > 0 && (!province.terrain || !filters.terrains.includes(province.terrain))) return false
  if (filters.continents.length > 0 && (!province.continent || !filters.continents.includes(province.continent))) return false
  if (filters.coastal === 'coastal' && province.isCoastal !== true) return false
  if (filters.coastal === 'inland' && province.isCoastal !== false) return false
  const issues = issuesByProvinceKey.get(province.key) ?? []
  if (filters.validation === 'clean' && issues.length > 0) return false
  if (filters.validation === 'any' && issues.length === 0) return false
  if (filters.severities.length > 0 && !issues.some((i) => filters.severities.includes(i.severity))) return false
  return true
}

function buildFilterSuggestions(
  provinceCatalog: readonly ProvinceCatalogEntry[],
  filters: ProvinceListFilters,
  t: (key: string, params?: Record<string, string | number>) => string
): FilterSuggestion[] {
  const types = uniqueSorted(provinceCatalog.map((p) => p.type))
    .filter((v) => !filters.types.includes(v))
    .map<FilterSuggestion>((v) => ({
      key: `type:${v}`, kind: 'type', value: v, label: v,
      groupLabel: t('provinceList.filter.type')
    }))

  const terrains = uniqueSorted(provinceCatalog.map((p) => p.terrain))
    .filter((v) => !filters.terrains.includes(v))
    .map<FilterSuggestion>((v) => ({
      key: `terrain:${v}`, kind: 'terrain', value: v, label: v,
      groupLabel: t('provinceList.filter.terrain')
    }))

  const continents = uniqueSorted(provinceCatalog.map((p) => p.continent))
    .filter((v) => !filters.continents.includes(v))
    .map<FilterSuggestion>((v) => ({
      key: `continent:${v}`, kind: 'continent', value: v, label: v,
      groupLabel: t('provinceList.filter.continent')
    }))

  const coastal: FilterSuggestion[] = []
  if (filters.coastal !== 'coastal') coastal.push({ key: 'coastal:coastal', kind: 'coastal', value: 'coastal', label: t('provinceList.filter.coastal.coastal'), groupLabel: t('provinceList.filter.coastal') })
  if (filters.coastal !== 'inland') coastal.push({ key: 'coastal:inland', kind: 'coastal', value: 'inland', label: t('provinceList.filter.coastal.inland'), groupLabel: t('provinceList.filter.coastal') })

  const validation: FilterSuggestion[] = []
  if (filters.validation !== 'any') validation.push({ key: 'validation:any', kind: 'validation', value: 'any', label: t('provinceList.filter.validation.any'), groupLabel: t('provinceList.filter.validation') })
  if (filters.validation !== 'clean') validation.push({ key: 'validation:clean', kind: 'validation', value: 'clean', label: t('provinceList.filter.validation.clean'), groupLabel: t('provinceList.filter.validation') })

  const severities = VALIDATION_SEVERITIES
    .filter((v) => !filters.severities.includes(v))
    .map<FilterSuggestion>((v) => ({
      key: `severity:${v}`, kind: 'severity', value: v,
      label: t(`provinceList.filter.severity.${v}`),
      groupLabel: t('provinceList.filter.severity')
    }))

  return [...validation, ...coastal, ...severities, ...types, ...terrains, ...continents]
}

function filterSuggestionsForQuery(suggestions: readonly FilterSuggestion[], query: string): FilterSuggestion[] {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return suggestions.slice(0, SUGGESTION_LIMIT)
  return suggestions
    .filter((s) => s.label.toLowerCase().includes(q) || s.groupLabel.toLowerCase().includes(q))
    .slice(0, SUGGESTION_LIMIT)
}

function applyFilterSuggestion(filters: ProvinceListFilters, suggestion: FilterSuggestion): ProvinceListFilters {
  if (suggestion.kind === 'type') return { ...filters, types: toggleFilterValue(filters.types, suggestion.value) }
  if (suggestion.kind === 'terrain') return { ...filters, terrains: toggleFilterValue(filters.terrains, suggestion.value) }
  if (suggestion.kind === 'continent') return { ...filters, continents: toggleFilterValue(filters.continents, suggestion.value) }
  if (suggestion.kind === 'coastal') return { ...filters, coastal: suggestion.value as CoastalFilter }
  if (suggestion.kind === 'validation') return { ...filters, validation: suggestion.value as ValidationFilter }
  return { ...filters, severities: toggleFilterValue(filters.severities, suggestion.value as ProvinceValidationSeverity) }
}

function buildActiveFilterTags(
  filters: ProvinceListFilters,
  t: (key: string, params?: Record<string, string | number>) => string
): Array<{ key: string; label: string }> {
  return [
    ...filters.types.map((v) => ({ key: `type:${v}`, label: `${t('provinceList.filter.type')}: ${v}` })),
    ...filters.terrains.map((v) => ({ key: `terrain:${v}`, label: `${t('provinceList.filter.terrain')}: ${v}` })),
    ...filters.continents.map((v) => ({ key: `continent:${v}`, label: `${t('provinceList.filter.continent')}: ${v}` })),
    ...(filters.coastal === 'all' ? [] : [{ key: `coastal:${filters.coastal}`, label: `${t('provinceList.filter.coastal')}: ${t(`provinceList.filter.coastal.${filters.coastal}`)}` }]),
    ...(filters.validation === 'all' ? [] : [{ key: `validation:${filters.validation}`, label: `${t('provinceList.filter.validation')}: ${t(`provinceList.filter.validation.${filters.validation}`)}` }]),
    ...filters.severities.map((v) => ({ key: `severity:${v}`, label: `${t('provinceList.filter.severity')}: ${t(`provinceList.filter.severity.${v}`)}` }))
  ]
}

function removeFilterTag(filters: ProvinceListFilters, key: string): ProvinceListFilters {
  const [kind, ...rest] = key.split(':')
  const value = rest.join(':')
  if (kind === 'type') return { ...filters, types: filters.types.filter((e) => e !== value) }
  if (kind === 'terrain') return { ...filters, terrains: filters.terrains.filter((e) => e !== value) }
  if (kind === 'continent') return { ...filters, continents: filters.continents.filter((e) => e !== value) }
  if (kind === 'coastal') return { ...filters, coastal: 'all' }
  if (kind === 'validation') return { ...filters, validation: 'all' }
  if (kind === 'severity') return { ...filters, severities: filters.severities.filter((e) => e !== value) }
  return filters
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
