import { useRef, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { makeStyles, mergeClasses, tokens, Text } from '@fluentui/react-components'

const ROW_H = 22

const useStyles = makeStyles({
  scroll: {
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
    position: 'relative',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: '12px',
    fontFamily: 'monospace'
  },
  headerRow: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    display: 'grid',
    backgroundColor: tokens.colorNeutralBackground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`
  },
  th: {
    padding: '4px 8px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  spacer: {
    position: 'relative',
    width: '100%'
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    display: 'grid',
    alignItems: 'center',
    boxSizing: 'border-box',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`
  },
  rowEven: {
    backgroundColor: tokens.colorNeutralBackground1
  },
  rowOdd: {
    backgroundColor: tokens.colorNeutralBackground2
  },
  cell: {
    padding: '3px 8px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  empty: {
    padding: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center'
  }
})

export interface VirtualTableColumn<T> {
  key: string
  header: ReactNode
  width: string
  render: (row: T, index: number) => ReactNode
  cellClassName?: string
}

interface VirtualTableProps<T> {
  columns: VirtualTableColumn<T>[]
  rows: T[]
  getRowKey: (row: T, index: number) => string | number
  emptyText?: string
}

/**
 * Windowed table used by the Data tab's per-entity tabs. Mirrors the
 * useVirtualizer pattern from EntityList, but renders CSS-grid rows so
 * columns stay aligned without native <table> layout (which can't host
 * absolutely-positioned virtualized rows).
 */
export function VirtualTable<T>({ columns, rows, getRowKey, emptyText }: VirtualTableProps<T>): JSX.Element {
  const styles = useStyles()
  const scrollRef = useRef<HTMLDivElement>(null)
  const gridTemplateColumns = columns.map((c) => c.width).join(' ')

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 16
  })

  return (
    <div ref={scrollRef} className={styles.scroll}>
      <div className={styles.headerRow} style={{ gridTemplateColumns }}>
        {columns.map((col) => (
          <div key={col.key} className={styles.th}>{col.header}</div>
        ))}
      </div>
      {rows.length === 0 ? (
        <Text size={200} className={styles.empty}>{emptyText}</Text>
      ) : (
        <div className={styles.spacer} style={{ height: rowVirtualizer.getTotalSize() }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]
            return (
              <div
                key={getRowKey(row, virtualRow.index)}
                className={mergeClasses(styles.row, virtualRow.index % 2 === 0 ? styles.rowEven : styles.rowOdd)}
                style={{ gridTemplateColumns, top: virtualRow.start, height: ROW_H }}
              >
                {columns.map((col) => (
                  <div key={col.key} className={mergeClasses(styles.cell, col.cellClassName)}>
                    {col.render(row, virtualRow.index)}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
