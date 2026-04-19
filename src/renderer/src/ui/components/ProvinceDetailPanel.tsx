import { useMemo, useState } from 'react'
import {
  Button,
  Checkbox,
  Divider,
  Select,
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  shorthands
} from '@fluentui/react-components'
import { unpackColor } from '../../../../shared/mapDataTypes'
import type { Province } from '../../../../shared/mapDataTypes'
import type { ProvinceCatalogEntry } from '../../../../shared/provinceCatalog'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { useI18n } from '../i18n/I18nProvider'

const useStyles = makeStyles({
  root: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: tokens.spacingHorizontalXS
  },
  count: {
    color: tokens.colorNeutralForeground3,
    padding: `0 ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3
  },
  tabStrip: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXXS,
    paddingBottom: tokens.spacingVerticalXXS
  },
  tab: {
    padding: `2px ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    fontFamily: 'monospace',
    cursor: 'pointer',
    flexShrink: 0,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground2
    }
  },
  tabActive: {
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke1}`,
    color: tokens.colorBrandForeground1
  },
  tabOverflow: {
    padding: `2px ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    flexShrink: 0
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    rowGap: tokens.spacingVerticalXS,
    columnGap: tokens.spacingHorizontalS,
    alignItems: 'start'
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    paddingTop: '4px'
  },
  fieldCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0
  },
  original: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    minWidth: 0
  },
  swatch: {
    width: '16px',
    height: '16px',
    borderRadius: tokens.borderRadiusSmall,
    ...shorthands.borderColor('rgba(255,255,255,0.3)'),
    flexShrink: 0,
    boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground4}`
  },
  swatchOrig: {
    width: '12px',
    height: '12px',
    borderRadius: tokens.borderRadiusSmall,
    ...shorthands.borderColor('rgba(255,255,255,0.2)'),
    flexShrink: 0,
    opacity: 0.5,
    boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground4}`
  },
  swatchArrow: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    lineHeight: 1
  },
  colorLabel: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    fontFamily: 'monospace'
  },
  idText: {
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: 'monospace',
    paddingTop: '4px'
  },
  revertRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS
  },
  revertButton: {
    flex: 1,
    justifyContent: 'center'
  },
  empty: {
    color: tokens.colorNeutralForeground4,
    fontSize: tokens.fontSizeBase100,
    textAlign: 'center',
    padding: `${tokens.spacingVerticalS} 0`
  },
  bmpInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS
  }
})

const TAB_SHOW_LIMIT = 5

interface Props {
  selectedProvinceIds: number[]
  selectedBmpGuids: string[]
  provinceCatalog: readonly ProvinceCatalogEntry[]
}

export function ProvinceDetailPanel({ selectedProvinceIds, selectedBmpGuids, provinceCatalog }: Props): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()

  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)

  // Build catalog lookup by id
  const catalogById = useMemo(() => {
    const map = new Map<number, ProvinceCatalogEntry>()
    for (const p of provinceCatalog) {
      if (p.id !== null) map.set(p.id, p)
    }
    return map
  }, [provinceCatalog])

  // Reverse lookup: guid -> canonical province id (via bmpReplacements)
  const guidToProvinceId = useMemo(() => {
    const map = new Map<string, number>()
    for (const [provinceId, guid] of bmpReplacements) {
      map.set(guid, provinceId)
    }
    return map
  }, [bmpReplacements])

  // Compute the effective list of items to display:
  // - canonical selected province ids (directly)
  // - BMP guids that resolved to a canonical province (via bmpReplacements)
  // - BMP guids with no canonical assignment (unregistered)
  interface DisplayItem {
    kind: 'canonical'
    provinceId: number
    label: string
  }
  interface DisplayBmpItem {
    kind: 'bmp-unassigned'
    guid: string
    label: string
  }
  type TabItem = DisplayItem | DisplayBmpItem

  const tabItems = useMemo<TabItem[]>(() => {
    const items: TabItem[] = []
    const seenProvinceIds = new Set<number>()

    for (const id of selectedProvinceIds) {
      if (!seenProvinceIds.has(id)) {
        seenProvinceIds.add(id)
        items.push({ kind: 'canonical', provinceId: id, label: String(id) })
      }
    }

    for (const guid of selectedBmpGuids) {
      const provinceId = guidToProvinceId.get(guid)
      if (provinceId !== undefined) {
        // Resolved to canonical — show as canonical if not already shown
        if (!seenProvinceIds.has(provinceId)) {
          seenProvinceIds.add(provinceId)
          items.push({ kind: 'canonical', provinceId, label: String(provinceId) })
        }
      } else {
        // Unassigned BMP
        items.push({ kind: 'bmp-unassigned', guid, label: guid })
      }
    }

    return items
  }, [selectedProvinceIds, selectedBmpGuids, guidToProvinceId])

  const [focusedTabIndex, setFocusedTabIndex] = useState(0)
  const safeFocusedIndex = Math.min(focusedTabIndex, Math.max(0, tabItems.length - 1))
  const focusedItem = tabItems[safeFocusedIndex]

  // For canonical multi-selection (all canonical IDs including from BMP resolved)
  const allCanonicalIds = useMemo(
    () => tabItems.filter((i): i is DisplayItem => i.kind === 'canonical').map((i) => i.provinceId),
    [tabItems]
  )

  const totalCount = tabItems.length

  const title =
    totalCount === 0
      ? t('provinceDetail.title.empty')
      : totalCount === 1
        ? (focusedItem?.kind === 'canonical'
            ? t('provinceEdit.title', { id: focusedItem.provinceId })
            : t('provinceDetail.title.bmp', { guid: focusedItem?.label ?? '' }))
        : t('provinceDetail.title.multi', { count: totalCount })

  const showTabs = totalCount > 1
  const visibleTabs = tabItems.slice(0, TAB_SHOW_LIMIT)
  const overflowCount = tabItems.length - TAB_SHOW_LIMIT

  // BMP entry lookup
  const bmpEntryByGuid = useMemo(
    () => new Map(bmpOnlyEntries.map((e) => [e.guid, e])),
    [bmpOnlyEntries]
  )

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text size={100} weight="semibold">{title}</Text>
        {totalCount > 1 && (
          <Text size={100} className={styles.count}>{totalCount}</Text>
        )}
      </div>

      {showTabs && (
        <div className={styles.tabStrip}>
          {visibleTabs.map((item, index) => (
            <div
              key={item.kind === 'canonical' ? `p:${item.provinceId}` : `b:${item.guid}`}
              role="button"
              tabIndex={0}
              className={mergeClasses(styles.tab, index === safeFocusedIndex && styles.tabActive)}
              onClick={() => setFocusedTabIndex(index)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFocusedTabIndex(index) }}
            >
              {item.label}
            </div>
          ))}
          {overflowCount > 0 && (
            <div className={styles.tabOverflow}>+{overflowCount}</div>
          )}
        </div>
      )}

      {totalCount === 0 && (
        <Text className={styles.empty}>{t('provinceDetail.empty')}</Text>
      )}

      {totalCount >= 1 && focusedItem && (
        <>
          {focusedItem.kind === 'canonical' && totalCount === 1 && (
            <SingleDetail provinceId={focusedItem.provinceId} />
          )}
          {focusedItem.kind === 'canonical' && totalCount > 1 && (
            // When multiple: show single detail for the focused tab's province
            <SingleDetail provinceId={focusedItem.provinceId} />
          )}
          {focusedItem.kind === 'bmp-unassigned' && (
            <BmpUnassignedDetail guid={focusedItem.guid} bmpEntryByGuid={bmpEntryByGuid} />
          )}
        </>
      )}

      {/* Show multi-edit only when multiple canonical provinces are selected and no focused BMP tab */}
      {totalCount > 1 && focusedItem?.kind === 'canonical' && allCanonicalIds.length > 1 && (
        <>
          <Divider />
          <MultiDetail selectedIds={allCanonicalIds} />
        </>
      )}
    </div>
  )
}

function BmpUnassignedDetail({
  guid,
  bmpEntryByGuid
}: {
  guid: string
  bmpEntryByGuid: Map<string, { guid: string; color: number }>
}): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const entry = bmpEntryByGuid.get(guid)

  return (
    <div className={styles.bmpInfo}>
      <div className={styles.grid}>
        <span className={styles.label}>{t('provinceDetail.bmpGuid')}</span>
        <span className={styles.idText}>{guid}</span>
        {entry && (
          <>
            <span className={styles.label}>{t('provinceEdit.color.label')}</span>
            <div className={styles.colorRow}>
              <div
                className={styles.swatch}
                style={{
                  backgroundColor: (() => {
                    const { r, g, b } = unpackColor(entry.color)
                    return `rgb(${r},${g},${b})`
                  })()
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SingleDetail({ provinceId }: { provinceId: number }): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()

  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const pendingEdits = useMapDataStore((s) => s.pendingEdits)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const editProvince = useMapDataStore((s) => s.editProvince)
  const revertEdit = useMapDataStore((s) => s.revertEdit)
  const revertBmpReplacement = useMapDataStore((s) => s.revertBmpReplacement)

  const sortedTerrains = useMemo(() => [...terrains.keys()].sort(), [terrains])
  const sortedContinents = useMemo(() => [...continents.keys()].sort(), [continents])
  const bmpOnlyByGuid = useMemo(
    () => new Map(bmpOnlyEntries.map((e) => [e.guid, e])),
    [bmpOnlyEntries]
  )

  const original = originalDefinitions.get(provinceId)
  const patch = pendingEdits.get(provinceId) ?? {}
  const replacingGuid = bmpReplacements.get(provinceId)
  const bmpEntry = replacingGuid ? bmpOnlyByGuid.get(replacingGuid) : undefined

  if (!original) return <></>

  const effective: Province = {
    ...original,
    ...patch,
    ...(bmpEntry ? { color: bmpEntry.color } : {})
  }

  const hasPatch = Object.keys(patch).length > 0
  const hasReplacement = bmpEntry !== undefined

  const set = (field: keyof Omit<Province, 'id' | 'color'>, value: string | boolean) =>
    editProvince(provinceId, { [field]: value })

  const origColor = unpackColor(original.color)
  const effColor = unpackColor(effective.color)

  const hexColor = (c: ReturnType<typeof unpackColor>) =>
    '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')

  return (
    <>
      <div className={styles.grid}>
        {/* ID */}
        <span className={mergeClasses(styles.label)}>{t('provinceDetail.id')}</span>
        <span className={styles.idText}>{provinceId}</span>

        {/* Color */}
        <span className={styles.label}>{t('provinceEdit.color.label')}</span>
        <div className={styles.fieldCell}>
          <div className={styles.colorRow}>
            {hasReplacement ? (
              <>
                <div className={styles.swatchOrig} style={{ backgroundColor: `rgb(${origColor.r},${origColor.g},${origColor.b})` }} />
                <span className={styles.swatchArrow}>→</span>
                <div className={styles.swatch} style={{ backgroundColor: `rgb(${effColor.r},${effColor.g},${effColor.b})` }} />
                <Text size={100} className={styles.colorLabel}>{t('provinceEdit.color.bmpAssigned')}</Text>
              </>
            ) : (
              <>
                <div className={styles.swatch} style={{ backgroundColor: `rgb(${effColor.r},${effColor.g},${effColor.b})` }} />
                <Text size={100} className={styles.colorLabel}>{hexColor(effColor)}</Text>
              </>
            )}
          </div>
        </div>

        {/* Type */}
        <span className={styles.label}>{t('provinceEdit.type.label')}</span>
        <div className={styles.fieldCell}>
          <Select size="small" value={effective.type} onChange={(_, d) => set('type', d.value as Province['type'])}>
            <option value="land">land</option>
            <option value="sea">sea</option>
            <option value="lake">lake</option>
          </Select>
          {patch.type !== undefined && patch.type !== original.type && (
            <Text size={100} className={styles.original}>{t('provinceEdit.original', { value: original.type })}</Text>
          )}
        </div>

        {/* Terrain */}
        <span className={styles.label}>{t('provinceEdit.terrain.label')}</span>
        <div className={styles.fieldCell}>
          <Select size="small" value={effective.terrain} onChange={(_, d) => set('terrain', d.value)}>
            {sortedTerrains.map((name) => <option key={name} value={name}>{name}</option>)}
          </Select>
          {patch.terrain !== undefined && patch.terrain !== original.terrain && (
            <Text size={100} className={styles.original}>{t('provinceEdit.original', { value: original.terrain })}</Text>
          )}
        </div>

        {/* Coastal */}
        <span className={styles.label}>{t('provinceEdit.coastal.label')}</span>
        <div className={styles.fieldCell}>
          <Checkbox
            checked={effective.isCoastal}
            onChange={(_, d) => set('isCoastal', d.checked === true)}
          />
          {patch.isCoastal !== undefined && patch.isCoastal !== original.isCoastal && (
            <Text size={100} className={styles.original}>
              {t('provinceEdit.original', {
                value: original.isCoastal ? t('provinceEdit.coastal.yes') : t('provinceEdit.coastal.no')
              })}
            </Text>
          )}
        </div>

        {/* Continent */}
        <span className={styles.label}>{t('provinceEdit.continent.label')}</span>
        <div className={styles.fieldCell}>
          <Select size="small" value={effective.continent} onChange={(_, d) => set('continent', d.value)}>
            <option value="">{t('provinceEdit.noneOption')}</option>
            {sortedContinents.map((name) => <option key={name} value={name}>{name}</option>)}
          </Select>
          {patch.continent !== undefined && patch.continent !== original.continent && (
            <Text size={100} className={styles.original}>
              {t('provinceEdit.original', { value: original.continent || t('provinceEdit.noneOption') })}
            </Text>
          )}
        </div>
      </div>

      {(hasPatch || hasReplacement) && (
        <>
          <Divider />
          <div className={styles.revertRow}>
            {hasPatch && (
              <Button size="small" appearance="subtle" className={styles.revertButton} onClick={() => revertEdit(provinceId)}>
                {t('provinceEdit.revertFields')}
              </Button>
            )}
            {hasReplacement && (
              <Button size="small" appearance="subtle" className={styles.revertButton} onClick={() => revertBmpReplacement(provinceId)}>
                {t('provinceEdit.revertColor')}
              </Button>
            )}
          </div>
        </>
      )}
    </>
  )
}

function MultiDetail({ selectedIds }: { selectedIds: number[] }): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()

  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const pendingEdits = useMapDataStore((s) => s.pendingEdits)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const editProvince = useMapDataStore((s) => s.editProvince)

  const sortedTerrains = useMemo(() => [...terrains.keys()].sort(), [terrains])
  const sortedContinents = useMemo(() => [...continents.keys()].sort(), [continents])

  // Compute effective values for each selected province
  const effectiveList = useMemo(() => selectedIds.map((id) => {
    const original = originalDefinitions.get(id)
    if (!original) return null
    const patch = pendingEdits.get(id) ?? {}
    return { ...original, ...patch }
  }).filter((p): p is Province => p !== null), [selectedIds, originalDefinitions, pendingEdits])

  const idRanges = useMemo(() => formatIdRanges(selectedIds), [selectedIds])

  const uniqueTypes = [...new Set(effectiveList.map((p) => p.type))]
  const uniqueTerrains = [...new Set(effectiveList.map((p) => p.terrain).filter(Boolean))]
  const uniqueContinents = [...new Set(effectiveList.map((p) => p.continent).filter(Boolean))]

  const sharedType = uniqueTypes.length === 1 ? uniqueTypes[0] : ''
  const sharedTerrain = uniqueTerrains.length === 1 ? uniqueTerrains[0] : ''
  const sharedContinent = uniqueContinents.length === 1 ? uniqueContinents[0] : ''

  const applyAll = (field: keyof Omit<Province, 'id' | 'color'>, value: string | boolean) => {
    for (const id of selectedIds) editProvince(id, { [field]: value })
  }

  const mixed = t('provinceDetail.mixed')

  return (
    <div className={styles.grid}>
      <span className={styles.label}>{t('provinceDetail.ids')}</span>
      <span className={styles.idText} title={idRanges}>{idRanges}</span>

      <span className={styles.label}>{t('provinceEdit.type.label')}</span>
      <Select size="small" value={sharedType} onChange={(_, d) => applyAll('type', d.value as Province['type'])}>
        {uniqueTypes.length > 1 && <option value="">{mixed}</option>}
        <option value="land">land</option>
        <option value="sea">sea</option>
        <option value="lake">lake</option>
      </Select>

      <span className={styles.label}>{t('provinceEdit.terrain.label')}</span>
      <Select size="small" value={sharedTerrain} onChange={(_, d) => applyAll('terrain', d.value)}>
        {uniqueTerrains.length > 1 && <option value="">{mixed}</option>}
        {sortedTerrains.map((name) => <option key={name} value={name}>{name}</option>)}
      </Select>

      <span className={styles.label}>{t('provinceEdit.continent.label')}</span>
      <Select size="small" value={sharedContinent} onChange={(_, d) => applyAll('continent', d.value)}>
        <option value="">{uniqueContinents.length > 1 ? mixed : t('provinceEdit.noneOption')}</option>
        {sortedContinents.map((name) => <option key={name} value={name}>{name}</option>)}
      </Select>
    </div>
  )
}

function formatIdRanges(ids: number[]): string {
  if (ids.length === 0) return '—'
  const sorted = [...ids].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      ranges.push(start === end ? `${start}` : `${start}–${end}`)
      start = end = sorted[i]
    }
  }
  ranges.push(start === end ? `${start}` : `${start}–${end}`)
  return ranges.join(', ')
}
