import { useRef, useEffect, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { makeStyles, mergeClasses, tokens, Text } from '@fluentui/react-components'
import type { Province } from '../../../shared/mapDataTypes'
import { unpackColor } from '../../../shared/mapDataTypes'

const ROW_H = 28

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
  scroll: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: 0
  },
  inner: {
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
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    cursor: 'default',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground2
    }
  },
  rowSelected: {
    backgroundColor: tokens.colorNeutralBackground3,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground3Hover
    }
  },
  swatch: {
    width: '12px',
    height: '12px',
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0
  },
  id: {
    fontFamily: 'monospace',
    width: '36px',
    textAlign: 'right',
    flexShrink: 0,
    color: tokens.colorNeutralForeground2
  },
  type: {
    width: '30px',
    flexShrink: 0,
    color: tokens.colorNeutralForeground3
  },
  terrain: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: tokens.colorNeutralForeground2
  },
  empty: {
    padding: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center'
  }
})

interface Props {
  provinces: Province[]   // pre-sorted by id
  selectedId: number | null
  onSelect?: (id: number) => void
}

export function ProvinceList({ provinces, selectedId, onSelect }: Props): JSX.Element {
  const styles = useStyles()
  const scrollRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: provinces.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 12
  })

  // Binary search — provinces are sorted by id.
  const selectedIndex = useMemo(() => {
    if (selectedId === null) return -1
    let lo = 0, hi = provinces.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const id = provinces[mid].id
      if (id === selectedId) return mid
      if (id < selectedId) lo = mid + 1
      else hi = mid - 1
    }
    return -1
  }, [selectedId, provinces])

  useEffect(() => {
    if (selectedIndex < 0) return
    rowVirtualizer.scrollToIndex(selectedIndex, { align: 'auto' })
  }, [selectedIndex, rowVirtualizer])

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text size={100} weight="semibold">Provinces</Text>
        <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>{provinces.length}</Text>
      </div>

      {provinces.length === 0 ? (
        <Text size={200} className={styles.empty}>No data loaded</Text>
      ) : (
        <div ref={scrollRef} className={styles.scroll}>
          <div className={styles.inner} style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((item) => {
              const p = provinces[item.index]
              const { r, g, b } = unpackColor(p.color)
              const isSelected = p.id === selectedId
              return (
                <div
                  key={item.key}
                  className={mergeClasses(styles.row, isSelected && styles.rowSelected)}
                  style={{ top: item.start, height: ROW_H }}
                  onClick={() => onSelect?.(p.id)}
                >
                  <div
                    className={styles.swatch}
                    style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                  />
                  <Text size={100} className={styles.id}>{p.id}</Text>
                  <Text size={100} className={styles.type}>{p.type}</Text>
                  <Text size={100} className={styles.terrain}>{p.terrain}</Text>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
