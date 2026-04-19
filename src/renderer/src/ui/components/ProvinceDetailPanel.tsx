import { useMemo } from 'react'
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
  }
})

interface Props {
  selectedIds: number[]
  provinceCatalog: readonly ProvinceCatalogEntry[]
}

export function ProvinceDetailPanel({ selectedIds, provinceCatalog }: Props): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()

  const catalogById = useMemo(() => {
    const map = new Map<number, ProvinceCatalogEntry>()
    for (const p of provinceCatalog) {
      if (p.id !== null) map.set(p.id, p)
    }
    return map
  }, [provinceCatalog])

  const selected = useMemo(
    () => selectedIds.map((id) => catalogById.get(id)).filter((p): p is ProvinceCatalogEntry => !!p),
    [catalogById, selectedIds]
  )

  const title =
    selected.length === 0
      ? t('provinceDetail.title.empty')
      : selected.length === 1
        ? t('provinceEdit.title', { id: selected[0].id ?? '?' })
        : t('provinceDetail.title.multi', { count: selected.length })

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text size={100} weight="semibold">{title}</Text>
        {selected.length > 1 && (
          <Text size={100} className={styles.count}>{selected.length}</Text>
        )}
      </div>

      {selected.length === 0 && (
        <Text className={styles.empty}>{t('provinceDetail.empty')}</Text>
      )}
      {selected.length === 1 && selected[0].id !== null && (
        <SingleDetail provinceId={selected[0].id} />
      )}
      {selected.length > 1 && (
        <MultiDetail selectedIds={selectedIds} />
      )}
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
