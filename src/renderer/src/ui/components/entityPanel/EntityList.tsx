import { useRef, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
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
  renderRow: (item: T) => ReactNode
  emptyText: string
}

/**
 * Shared virtualized list used by the province, state, and strategic-region
 * panels: same row chrome (hover/selected/edited states), parametrized over
 * the entity's row content. Search/filtering lives in `EntitySearchBar`,
 * rendered by the caller above this list.
 */
export function EntityList<T>({
  items,
  getId,
  isSelected,
  isEdited,
  onSelect,
  renderRow,
  emptyText
}: EntityListProps<T>): JSX.Element {
  const styles = useStyles()
  const scrollRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 12
  })

  return (
    <div className={styles.section}>
      {items.length === 0 ? (
        <Text size={200} className={styles.empty}>{emptyText}</Text>
      ) : (
        <div ref={scrollRef} className={styles.scroll}>
          <List as="div" className={styles.list}>
            <div className={styles.spacer} style={{ height: rowVirtualizer.getTotalSize() }}>
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const item = items[virtualItem.index]
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
