import { useRef, useMemo, useState, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Input,
  List,
  ListItem,
  makeStyles,
  mergeClasses,
  tokens,
  Text
} from '@fluentui/react-components'

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
  searchBar: {
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0
  },
  searchInput: {
    width: '100%'
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
    }
  },
  rowSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke1}`,
    boxShadow: tokens.shadow4,
    '&:hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      border: `1px solid ${tokens.colorBrandStroke1}`
    }
  },
  rowEdited: {
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '7px',
      bottom: '7px',
      width: '2px',
      borderRadius: tokens.borderRadiusCircular,
      backgroundColor: tokens.colorPaletteGoldForeground2
    }
  },
  rowInner: {
    display: 'flex',
    alignItems: 'baseline',
    boxSizing: 'border-box',
    gap: tokens.spacingHorizontalXS
  },
  empty: {
    padding: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center'
  }
})

interface EntityListProps<T> {
  items: T[]
  getId: (item: T) => number
  isSelected: (item: T) => boolean
  isEdited: (item: T) => boolean
  onSelect: (item: T) => void
  searchPredicate: (item: T, query: string) => boolean
  renderRow: (item: T) => ReactNode
  searchPlaceholder: string
  emptyText: string
}

/**
 * Shared virtualized, searchable list used by the state and strategic-region
 * panels: same row chrome (hover/selected/edited states) and search bar,
 * parametrized over the entity's row content.
 */
export function EntityList<T>({
  items,
  getId,
  isSelected,
  isEdited,
  onSelect,
  searchPredicate,
  renderRow,
  searchPlaceholder,
  emptyText
}: EntityListProps<T>): JSX.Element {
  const styles = useStyles()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => searchPredicate(item, q))
  }, [items, search, searchPredicate])

  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 12
  })

  return (
    <div className={styles.section}>
      <div className={styles.searchBar}>
        <Input
          size="small"
          className={styles.searchInput}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(_, data) => setSearch(data.value)}
        />
      </div>
      {filteredItems.length === 0 ? (
        <Text size={200} className={styles.empty}>{emptyText}</Text>
      ) : (
        <div ref={scrollRef} className={styles.scroll}>
          <List as="div" className={styles.list}>
            <div className={styles.spacer} style={{ height: rowVirtualizer.getTotalSize() }}>
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const item = filteredItems[virtualItem.index]
                const selected = isSelected(item)
                const edited = isEdited(item)

                return (
                  <ListItem
                    as="div"
                    key={getId(item)}
                    className={mergeClasses(
                      styles.row,
                      edited && styles.rowEdited,
                      selected && styles.rowSelected
                    )}
                    style={{ top: virtualItem.start + 2, height: ROW_H - 4 }}
                    onClick={() => onSelect(item)}
                  >
                    <div className={styles.rowInner}>{renderRow(item)}</div>
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
