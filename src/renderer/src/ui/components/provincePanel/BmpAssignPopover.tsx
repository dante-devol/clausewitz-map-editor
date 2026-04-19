import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Button,
  Input,
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  Divider,
  shorthands
} from '@fluentui/react-components'
import { unpackColor } from '../../../../../shared/mapDataTypes'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { useI18n } from '../../i18n/I18nProvider'
import { TYPE_COLORS, continentColor } from '../../../infra/config/displayModes'

const ROW_H = 30

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '320px',
    gap: tokens.spacingVerticalXS
  },
  title: {
    color: tokens.colorNeutralForeground2,
    paddingBottom: tokens.spacingVerticalXXS
  },
  counter: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    paddingBottom: tokens.spacingVerticalXXS
  },
  counterFilled: {
    fontVariantNumeric: 'tabular-nums',
    color: tokens.colorBrandForeground1
  },
  counterTotal: {
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: 'tabular-nums'
  },
  counterHint: {
    color: tokens.colorNeutralForeground3,
    flex: 1
  },
  search: {
    width: '100%'
  },
  scroll: {
    height: '280px',
    overflowY: 'auto',
    overflowX: 'hidden',
    position: 'relative',
    userSelect: 'none'
  },
  virtualSpacer: {
    position: 'relative',
    width: '100%'
  },
  provinceRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    paddingLeft: tokens.spacingHorizontalXXS,
    paddingRight: tokens.spacingHorizontalXS,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorTransparentStroke}`,
    cursor: 'pointer',
    boxSizing: 'border-box',
    overflow: 'hidden',
    transitionProperty: 'background-color, border-color',
    transitionDuration: tokens.durationFaster,
    transitionTimingFunction: tokens.curveEasyEase,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground2,
      border: `1px solid ${tokens.colorNeutralStroke2}`
    }
  },
  provinceRowOrphaned: {
    backgroundColor: 'rgba(227, 164, 0, 0.06)',
    border: `1px solid rgba(227, 164, 0, 0.2)`,
    '&:hover': {
      backgroundColor: 'rgba(227, 164, 0, 0.12)',
      border: `1px solid rgba(227, 164, 0, 0.36)`
    }
  },
  provinceRowClaimed: {
    opacity: 0.5
  },
  provinceRowSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke1}`,
    '&:hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      border: `1px solid ${tokens.colorBrandStroke1}`
    }
  },
  offMapBadge: {
    padding: `1px ${tokens.spacingHorizontalXXS}`,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    ...shorthands.borderColor('rgba(227, 164, 0, 0.32)'),
    backgroundColor: 'rgba(227, 164, 0, 0.12)',
    color: tokens.colorPaletteGoldForeground2,
    flexShrink: 0
  },
  swatch: {
    width: '10px',
    height: '10px',
    borderRadius: tokens.borderRadiusCircular,
    flexShrink: 0,
    ...shorthands.borderColor('rgba(255,255,255,0.3)'),
    boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground4}`
  },
  id: {
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
    width: '38px',
    textAlign: 'right',
    flexShrink: 0,
    color: tokens.colorNeutralForeground2
  },
  chip: {
    padding: `1px ${tokens.spacingHorizontalXXS}`,
    borderRadius: tokens.borderRadiusSmall,
    border: '1px solid transparent',
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    flexShrink: 0,
    maxWidth: '72px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  typeChip: {
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    width: '34px',
    textAlign: 'center'
  },
  rowSpacer: {
    flex: 1,
    minWidth: 0
  },
  claimedBadge: {
    padding: `1px ${tokens.spacingHorizontalXXS}`,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    ...shorthands.borderColor(tokens.colorNeutralStroke1),
    color: tokens.colorNeutralForeground3,
    flexShrink: 0
  },
  orderBadge: {
    width: '18px',
    height: '18px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: tokens.fontSizeBase100,
    lineHeight: '18px',
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0
  },
  emptyHint: {
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    padding: tokens.spacingVerticalS
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS
  },
  registerButton: {
    width: '100%',
    justifyContent: 'center'
  }
})

type SingleProps = {
  guid: string
  selectedGuids?: undefined
  onDismiss: () => void
}

type MultiProps = {
  guid?: undefined
  selectedGuids: string[]
  onDismiss: () => void
}

type Props = SingleProps | MultiProps

export function BmpAssignPopover({ guid, selectedGuids, onDismiss }: Props): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [selectedTargetIds, setSelectedTargetIds] = useState<number[]>([])
  const [lastTargetIndex, setLastTargetIndex] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const isMulti = selectedGuids !== undefined
  const totalToFill = isMulti ? selectedGuids.length : 1

  const provinceCatalog = useMapDataStore((s) => s.provinceCatalog)
  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const pendingReassignments = useMapDataStore((s) => s.pendingReassignments)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const assignBmpProvince = useMapDataStore((s) => s.assignBmpProvince)

  const claimedByOthers = useMemo(() => {
    const claimed = new Set<number>()
    const selfGuids = new Set(isMulti ? selectedGuids : [guid!])
    for (const [otherGuid, action] of pendingReassignments) {
      if (!selfGuids.has(otherGuid) && action.type === 'replace') claimed.add(action.targetId)
    }
    return claimed
  }, [pendingReassignments, guid, selectedGuids, isMulti])

  const nextAvailableId = useMemo(() => {
    if (originalDefinitions.size === 0) return 1
    const maxExisting = Math.max(...originalDefinitions.keys())
    // Account for pending register assignments to avoid collisions
    let pending = 0
    for (const action of pendingReassignments.values()) {
      if (action.type === 'register') pending++
    }
    return maxExisting + pending + 1
  }, [originalDefinitions, pendingReassignments])

  const sortedCanonical = useMemo(() => {
    const canonical = provinceCatalog.filter((e) => e.canonical && e.id !== null && e.id !== 0)
    const unclaimedOrphaned = canonical.filter((e) => e.mapPresence === 'missing' && !claimedByOthers.has(e.id!))
    const claimedOrphaned = canonical.filter((e) => e.mapPresence === 'missing' && claimedByOthers.has(e.id!))
    const rest = canonical.filter((e) => e.mapPresence !== 'missing')
    return [...unclaimedOrphaned, ...claimedOrphaned, ...rest]
  }, [provinceCatalog, claimedByOthers])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (q.length === 0) return sortedCanonical
    return sortedCanonical.filter((e) => String(e.id).includes(q))
  }, [sortedCanonical, query])

  const selectedTargetSet = useMemo(() => new Set(selectedTargetIds), [selectedTargetIds])

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 8
  })

  const handleSingleReplace = (targetId: number) => {
    assignBmpProvince(guid!, { type: 'replace', targetId })
    onDismiss()
  }

  const handleSingleRegisterNew = () => {
    assignBmpProvince(guid!, { type: 'register', assignedId: nextAvailableId })
    onDismiss()
  }

  const handleMultiRowClick = (id: number, index: number, e: React.MouseEvent) => {
    e.preventDefault()
    if (e.shiftKey && lastTargetIndex !== null) {
      const start = Math.min(lastTargetIndex, index)
      const end = Math.max(lastTargetIndex, index)
      const rangeIds = filtered.slice(start, end + 1).map((en) => en.id!)
      // Toggle range: if all are selected, deselect; otherwise add missing ones
      const allSelected = rangeIds.every((rid) => selectedTargetSet.has(rid))
      setSelectedTargetIds((prev) => {
        if (allSelected) {
          const removeSet = new Set(rangeIds)
          return prev.filter((rid) => !removeSet.has(rid))
        } else {
          const existing = new Set(prev)
          const added = rangeIds.filter((rid) => !existing.has(rid))
          return [...prev, ...added]
        }
      })
    } else {
      if (selectedTargetSet.has(id)) {
        setSelectedTargetIds((prev) => prev.filter((rid) => rid !== id))
      } else if (selectedTargetIds.length < totalToFill) {
        setSelectedTargetIds((prev) => [...prev, id])
      }
      setLastTargetIndex(index)
    }
  }

  const handleApply = () => {
    const guids = selectedGuids!
    // Assign filled slots in order
    for (let i = 0; i < selectedTargetIds.length && i < guids.length; i++) {
      assignBmpProvince(guids[i], { type: 'replace', targetId: selectedTargetIds[i] })
    }
    // Register remaining
    let nextId = nextAvailableId
    for (let i = selectedTargetIds.length; i < guids.length; i++) {
      assignBmpProvince(guids[i], { type: 'register', assignedId: nextId++ })
    }
    onDismiss()
  }

  const handleApplyFilled = () => {
    const guids = selectedGuids!
    for (let i = 0; i < selectedTargetIds.length && i < guids.length; i++) {
      assignBmpProvince(guids[i], { type: 'replace', targetId: selectedTargetIds[i] })
    }
    onDismiss()
  }

  const remainingCount = totalToFill - selectedTargetIds.length

  if (isMulti) {
    return (
      <div className={styles.root}>
        <div className={styles.counter}>
          <Text size={100} weight="semibold" className={styles.counterFilled}>
            {selectedTargetIds.length}
          </Text>
          <Text size={100} className={styles.counterTotal}>/ {totalToFill} {t('bmpAssign.multi.filled')}</Text>
          <div className={styles.counterHint} />
          <Text size={100} className={styles.counterHint}>{t('bmpAssign.multi.hint')}</Text>
        </div>

        <Input
          size="small"
          className={styles.search}
          placeholder={t('bmpAssign.search.placeholder')}
          value={query}
          onChange={(_, data) => setQuery(data.value)}
          autoFocus
        />

        <div ref={scrollRef} className={styles.scroll}>
          {filtered.length === 0 ? (
            <Text size={100} className={styles.emptyHint}>{t('bmpAssign.noResults')}</Text>
          ) : (
            <div className={styles.virtualSpacer} style={{ height: rowVirtualizer.getTotalSize() }}>
              {rowVirtualizer.getVirtualItems().map((item) => {
                const entry = filtered[item.index]
                const id = entry.id!
                const isOrphaned = entry.mapPresence === 'missing'
                const isClaimed = claimedByOthers.has(id)
                const selectionIndex = selectedTargetIds.indexOf(id)
                const isSelected = selectionIndex !== -1
                const isAtCapacity = !isSelected && selectedTargetIds.length >= totalToFill

                const display = originalDefinitions.get(id) ?? entry
                const color = display.color ?? entry.color ?? 0
                const { r, g, b } = unpackColor(color)

                const typeHex = entry.type ? (TYPE_COLORS[entry.type] ?? '#808080') : '#808080'
                const typeStyle = makeHexChipStyle(typeHex)

                const terrainColor = display.terrain ? terrains.get(display.terrain)?.color : undefined
                const terrainStyle = terrainColor !== undefined ? makePackedChipStyle(terrainColor) : undefined

                const continent = display.continent ? continents.get(display.continent) : undefined
                const continentStyle = continent !== undefined
                  ? makePackedChipStyle(continentColor(continent.position))
                  : undefined

                return (
                  <div
                    key={id}
                    role="button"
                    tabIndex={0}
                    className={mergeClasses(
                      styles.provinceRow,
                      isOrphaned && !isSelected && styles.provinceRowOrphaned,
                      isClaimed && !isSelected && styles.provinceRowClaimed,
                      isSelected && styles.provinceRowSelected
                    )}
                    style={{
                      top: item.start + 1,
                      height: ROW_H - 2,
                      opacity: isAtCapacity ? 0.4 : undefined
                    }}
                    onClick={(e) => handleMultiRowClick(id, item.index, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleMultiRowClick(id, item.index, e as unknown as React.MouseEvent)
                    }}
                  >
                    {isSelected && (
                      <Text size={100} className={styles.orderBadge}>{selectionIndex + 1}</Text>
                    )}
                    {isOrphaned && !isSelected && (
                      <Text size={100} className={styles.offMapBadge}>
                        {t('bmpAssign.offMap')}
                      </Text>
                    )}
                    <div className={styles.swatch} style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
                    <Text size={100} className={styles.id}>{id}</Text>
                    {entry.type && (
                      <Text size={100} className={mergeClasses(styles.chip, styles.typeChip)} style={typeStyle}>
                        {entry.type}
                      </Text>
                    )}
                    {display.terrain && (
                      <Text size={100} className={styles.chip} style={terrainStyle}>
                        {display.terrain}
                      </Text>
                    )}
                    {continent && (
                      <Text size={100} className={styles.chip} style={continentStyle}>
                        {continent.codeName}
                      </Text>
                    )}
                    <div className={styles.rowSpacer} />
                    {isClaimed && !isSelected && (
                      <Text size={100} className={styles.claimedBadge}>
                        {t('bmpAssign.claimed')}
                      </Text>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Divider />

        <div className={styles.actions}>
          <Button
            size="small"
            appearance="primary"
            className={styles.registerButton}
            onClick={handleApply}
          >
            {remainingCount > 0
              ? t('bmpAssign.multi.applyAndRegister', { filled: selectedTargetIds.length, remaining: remainingCount })
              : t('bmpAssign.multi.apply', { count: totalToFill })}
          </Button>
          {selectedTargetIds.length > 0 && remainingCount > 0 && (
            <Button
              size="small"
              appearance="secondary"
              className={styles.registerButton}
              onClick={handleApplyFilled}
            >
              {t('bmpAssign.multi.applyFilled', { count: selectedTargetIds.length })}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Single mode
  return (
    <div className={styles.root}>
      <Text size={100} weight="semibold" className={styles.title}>
        {t('bmpAssign.title')}
      </Text>

      <Input
        size="small"
        className={styles.search}
        placeholder={t('bmpAssign.search.placeholder')}
        value={query}
        onChange={(_, data) => setQuery(data.value)}
        autoFocus
      />

      <div ref={scrollRef} className={styles.scroll}>
        {filtered.length === 0 ? (
          <Text size={100} className={styles.emptyHint}>{t('bmpAssign.noResults')}</Text>
        ) : (
          <div className={styles.virtualSpacer} style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((item) => {
              const entry = filtered[item.index]
              const id = entry.id!
              const isOrphaned = entry.mapPresence === 'missing'
              const isClaimed = claimedByOthers.has(id)

              const display = originalDefinitions.get(id) ?? entry
              const color = display.color ?? entry.color ?? 0
              const { r, g, b } = unpackColor(color)

              const typeHex = entry.type ? (TYPE_COLORS[entry.type] ?? '#808080') : '#808080'
              const typeStyle = makeHexChipStyle(typeHex)

              const terrainColor = display.terrain ? terrains.get(display.terrain)?.color : undefined
              const terrainStyle = terrainColor !== undefined ? makePackedChipStyle(terrainColor) : undefined

              const continent = display.continent ? continents.get(display.continent) : undefined
              const continentStyle = continent !== undefined
                ? makePackedChipStyle(continentColor(continent.position))
                : undefined

              return (
                <div
                  key={id}
                  role="button"
                  tabIndex={0}
                  className={mergeClasses(
                    styles.provinceRow,
                    isOrphaned && styles.provinceRowOrphaned,
                    isClaimed && styles.provinceRowClaimed
                  )}
                  style={{ top: item.start + 1, height: ROW_H - 2 }}
                  onClick={() => handleSingleReplace(id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleSingleReplace(id)
                  }}
                >
                  {isOrphaned && (
                    <Text size={100} className={styles.offMapBadge}>
                      {t('bmpAssign.offMap')}
                    </Text>
                  )}
                  <div className={styles.swatch} style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
                  <Text size={100} className={styles.id}>{id}</Text>
                  {entry.type && (
                    <Text size={100} className={mergeClasses(styles.chip, styles.typeChip)} style={typeStyle}>
                      {entry.type}
                    </Text>
                  )}
                  {display.terrain && (
                    <Text size={100} className={styles.chip} style={terrainStyle}>
                      {display.terrain}
                    </Text>
                  )}
                  {continent && (
                    <Text size={100} className={styles.chip} style={continentStyle}>
                      {continent.codeName}
                    </Text>
                  )}
                  <div className={styles.rowSpacer} />
                  {isClaimed && (
                    <Text size={100} className={styles.claimedBadge}>
                      {t('bmpAssign.claimed')}
                    </Text>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Divider />

      <Button
        size="small"
        appearance="primary"
        className={styles.registerButton}
        onClick={handleSingleRegisterNew}
      >
        {t('bmpAssign.registerNew', { id: nextAvailableId })}
      </Button>
    </div>
  )
}

function makeHexChipStyle(hex: string): { backgroundColor: string; borderColor: string; color: string } {
  const v = parseInt(hex.replace('#', ''), 16)
  const r = (v >> 16) & 0xff
  const g = (v >> 8) & 0xff
  const b = v & 0xff
  return makePackedChipStyle((r << 16) | (g << 8) | b)
}

function makePackedChipStyle(color: number): { backgroundColor: string; borderColor: string; color: string } {
  const { r, g, b } = unpackColor(color)
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.14)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.3)`,
    color: `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`
  }
}

function lighten(v: number): number {
  return Math.min(255, Math.round(v * 0.7 + 76))
}
