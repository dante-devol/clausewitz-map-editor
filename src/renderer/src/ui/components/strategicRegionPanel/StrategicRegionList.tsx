import { useRef, useMemo, useState } from 'react'
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
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'

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
    listStyleType: 'none',
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
    gap: tokens.spacingHorizontalXS,
  },
  id: {
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
    width: '36px',
    textAlign: 'right',
    flexShrink: 0,
    color: tokens.colorNeutralForeground2
  },
  name: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  count: {
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
    fontFamily: 'monospace'
  },
  empty: {
    padding: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center'
  }
})

export function StrategicRegionList(): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)

  const strategicRegions = useMapDataStore((s) => s.strategicRegions)
  const selectedStrategicRegionId = useMapDataStore((s) => s.selectedStrategicRegionId)
  const setSelectedStrategicRegionId = useMapDataStore((s) => s.setSelectedStrategicRegionId)
  const pendingStrategicRegionEdits = useMapDataStore((s) => s.pendingStrategicRegionEdits)

  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return strategicRegions
    return strategicRegions.filter((r) =>
      r.id.toString().includes(q) || r.name.toLowerCase().includes(q)
    )
  }, [strategicRegions, search])

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
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
          placeholder={t('stratRegionPanel.list.searchPlaceholder')}
          value={search}
          onChange={(_, data) => setSearch(data.value)}
        />
      </div>
      {filtered.length === 0 ? (
        <Text size={200} className={styles.empty}>{t('stratRegionPanel.list.empty')}</Text>
      ) : (
        <div ref={scrollRef} className={styles.scroll}>
          <List as="div" className={styles.list}>
            <div className={styles.spacer} style={{ height: rowVirtualizer.getTotalSize() }}>
              {rowVirtualizer.getVirtualItems().map((item) => {
                const region = filtered[item.index]
                const isSelected = region.id === selectedStrategicRegionId
                const isEdited = pendingStrategicRegionEdits.has(region.id)
                const patch = pendingStrategicRegionEdits.get(region.id)
                const displayName = patch?.name ?? region.name

                return (
                  <ListItem
                    as="div"
                    key={region.id}
                    className={mergeClasses(
                      styles.row,
                      isEdited && styles.rowEdited,
                      isSelected && styles.rowSelected
                    )}
                    style={{ top: item.start + 2, height: ROW_H - 4 }}
                    onClick={() => setSelectedStrategicRegionId(isSelected ? null : region.id)}
                  >
                    <div className={styles.rowInner}>
                      <Text size={100} className={styles.id}>{region.id}</Text>
                      <Text size={100} className={styles.name}>{displayName || `Region ${region.id}`}</Text>
                      <Text size={100} className={styles.count}>{region.provinceIds.length}</Text>
                    </div>
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
