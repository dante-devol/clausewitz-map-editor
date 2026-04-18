import { useRef, useEffect, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { List, ListItem, makeStyles, mergeClasses, tokens, Text } from '@fluentui/react-components'
import type { Province } from '../../../shared/mapDataTypes'
import { unpackColor } from '../../../shared/mapDataTypes'
import { TYPE_COLORS, continentColor } from '../config/displayModes'
import { useMapDataStore } from '../store/mapDataStore'

const ROW_H = 36

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    flex: 1
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
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalXS} ${tokens.spacingVerticalXS} 0`
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
    left: tokens.spacingHorizontalXS,
    right: tokens.spacingHorizontalXS,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    paddingLeft: tokens.spacingHorizontalXS,
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
      borderColor: tokens.colorNeutralStroke2,
      transform: 'translateY(-1px)'
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 7,
      bottom: 7,
      width: '2px',
      borderRadius: tokens.borderRadiusCircular,
      backgroundColor: 'transparent'
    }
  },
  rowSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    borderColor: tokens.colorBrandStroke1,
    boxShadow: tokens.shadow4,
    '&:hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      borderColor: tokens.colorBrandStroke1
    },
    '&::before': {
      backgroundColor: tokens.colorBrandForeground1
    }
  },
  swatch: {
    width: '12px',
    height: '12px',
    borderRadius: tokens.borderRadiusCircular,
    border: `1px solid rgba(255,255,255,0.35)`,
    flexShrink: 0,
    marginLeft: tokens.spacingHorizontalXXS,
    marginRight: tokens.spacingHorizontalXS,
    boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground4}`
  },
  id: {
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
    width: '32px',
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
    maxWidth: '72px',
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
  provinces: ReadonlyMap<number, Province>
  selectedId: number | null
  onSelect?: (id: number) => void
}

export function ProvinceList({ provinces, selectedId, onSelect }: Props): JSX.Element {
  const styles = useStyles()
  const scrollRef = useRef<HTMLDivElement>(null)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)

  const sortedProvinces = useMemo(
    () => [...provinces.values()].sort((a, b) => a.id - b.id),
    [provinces]
  )

  const rowVirtualizer = useVirtualizer({
    count: sortedProvinces.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 12
  })

  const selectedIndex = useMemo(() => {
    if (selectedId === null) return -1
    let lo = 0, hi = sortedProvinces.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const id = sortedProvinces[mid].id
      if (id === selectedId) return mid
      if (id < selectedId) lo = mid + 1
      else hi = mid - 1
    }
    return -1
  }, [selectedId, sortedProvinces])

  useEffect(() => {
    if (selectedIndex < 0) return
    rowVirtualizer.scrollToIndex(selectedIndex, { align: 'center' })
  }, [selectedIndex, rowVirtualizer])

  const typeChipStyle = (type: Province['type']) => {
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
        <Text size={100} weight="semibold">Provinces</Text>
        <Text size={100} className={styles.count}>{sortedProvinces.length}</Text>
      </div>

      {sortedProvinces.length === 0 ? (
        <Text size={200} className={styles.empty}>No data loaded</Text>
      ) : (
        <div ref={scrollRef} className={styles.scroll}>
          <List as="div" className={styles.list}>
            <div className={styles.spacer} style={{ height: rowVirtualizer.getTotalSize() }}>
              {rowVirtualizer.getVirtualItems().map((item) => {
                const p = sortedProvinces[item.index]
                const { r, g, b } = unpackColor(p.color)
                const isSelected = p.id === selectedId
                const terrainColor = terrains.get(p.terrain)?.color
                const terrainChipStyle = terrainColor !== undefined
                  ? makePackedChipStyle(terrainColor)
                  : undefined
                const continent = continents.get(p.continent)
                const continentChipStyle = continent !== undefined
                  ? makePackedChipStyle(continentColor(continent.position))
                  : undefined
                return (
                  <ListItem
                    as="div"
                    key={item.key}
                    className={mergeClasses(styles.row, isSelected && styles.rowSelected)}
                    style={{ top: item.start + 2, height: ROW_H - 4 }}
                    onClick={() => onSelect?.(p.id)}
                  >
                    <div
                      className={styles.swatch}
                      style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                    />
                    <Text size={100} className={styles.id}>{p.id}</Text>
                    <Text size={100} className={styles.type} style={typeChipStyle(p.type)}>
                      {p.type}
                    </Text>
                    <Text
                      size={100}
                      className={mergeClasses(styles.chip, styles.terrain)}
                      style={terrainChipStyle}
                    >
                      {p.terrain}
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
