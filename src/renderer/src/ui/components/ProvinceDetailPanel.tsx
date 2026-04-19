import { useMemo, useState } from 'react'
import { makeStyles, tokens, Text, Input, Select, Checkbox } from '@fluentui/react-components'
import type { ProvinceType, TerrainCategory, Continent } from '../../../../shared/mapDataTypes'
import { unpackColor } from '../../../../shared/mapDataTypes'
import type { ProvinceCatalogEntry } from '../../../../shared/provinceCatalog'
import { useMapDataStore } from '../../infra/store/mapDataStore'

const useStyles = makeStyles({
  root: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: tokens.spacingHorizontalXS,
    marginBottom: tokens.spacingVerticalXS
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
    alignItems: 'center',
    minWidth: 0
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    whiteSpace: 'nowrap',
    userSelect: 'none'
  },
  colorRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    alignItems: 'center',
    minWidth: 0
  },
  swatch: {
    width: '16px',
    height: '16px',
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0
  },
  idText: {
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: 'monospace'
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
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)

  const catalogById = useMemo(() => {
    const map = new Map<number, ProvinceCatalogEntry>()
    for (const province of provinceCatalog) {
      if (province.id !== null) map.set(province.id, province)
    }
    return map
  }, [provinceCatalog])

  const selected = useMemo(() => (
    selectedIds
      .map((id) => catalogById.get(id))
      .filter((p): p is ProvinceCatalogEntry => !!p)
  ), [catalogById, selectedIds])

  const headerLabel =
    selected.length === 0
      ? 'Selection'
      : selected.length === 1
        ? `Province ${formatProvinceId(selected[0])}`
        : `${selected.length} Provinces`

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text size={100} weight="semibold">
          {headerLabel}
        </Text>
        {selected.length > 1 && (
          <Text size={100} className={styles.count}>
            {selected.length}
          </Text>
        )}
      </div>

      {selected.length === 0 && (
        <Text className={styles.empty}>Select a province to view details</Text>
      )}
      {selected.length === 1 && (
        <SingleDetail
          key={selected[0].id}
          province={selected[0]}
          terrains={terrains}
          continents={continents}
        />
      )}
      {selected.length > 1 && (
        <MultiDetail
          key={selected.map((p) => p.id).join(',')}
          provinces={selected}
          terrains={terrains}
          continents={continents}
        />
      )}
    </div>
  )
}

interface DetailSharedProps {
  terrains: ReadonlyMap<string, TerrainCategory>
  continents: ReadonlyMap<string, Continent>
}

function SingleDetail({
  province,
  terrains,
  continents
}: { province: ProvinceCatalogEntry } & DetailSharedProps): JSX.Element {
  const styles = useStyles()
  const { r, g, b } = unpackColor(province.color ?? 0)
  const hexColor =
    '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0')

  const [type, setType] = useState<ProvinceType | ''>(province.type ?? '')
  const [terrain, setTerrain] = useState(province.terrain ?? '')
  const [continent, setContinent] = useState(province.continent ?? '')

  const terrainKeys = useMemo(() => [...terrains.keys()].sort(), [terrains])
  const continentKeys = useMemo(() => [...continents.keys()].sort(), [continents])

  return (
    <div className={styles.grid}>
      <span className={styles.label}>ID</span>
      <Input size="small" value={formatProvinceId(province)} readOnly />

      <span className={styles.label}>Color</span>
      <div className={styles.colorRow}>
        <div className={styles.swatch} style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
        <Input size="small" value={province.color === null ? '—' : hexColor} readOnly style={{ flex: 1, minWidth: 0 }} />
      </div>

      <span className={styles.label}>Type</span>
      <Select size="small" value={type} onChange={(_, d) => setType(d.value as ProvinceType)}>
        <option value="">—</option>
        <option value="land">land</option>
        <option value="sea">sea</option>
        <option value="lake">lake</option>
      </Select>

      <span className={styles.label}>Terrain</span>
      <Select size="small" value={terrain} onChange={(_, d) => setTerrain(d.value)}>
        <option value="">—</option>
        {terrainKeys.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </Select>

      <span className={styles.label}>Continent</span>
      <Select size="small" value={continent} onChange={(_, d) => setContinent(d.value)}>
        <option value="">—</option>
        {continentKeys.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </Select>

      <span className={styles.label}>Coastal</span>
      <Checkbox checked={province.isCoastal ?? false} disabled aria-label="Is coastal" />
    </div>
  )
}

function MultiDetail({
  provinces,
  terrains,
  continents
}: { provinces: ProvinceCatalogEntry[] } & DetailSharedProps): JSX.Element {
  const styles = useStyles()

  const idRanges = formatIdRanges(provinces.map((p) => p.id))

  const uniqueTypes = [...new Set(provinces.map((p) => p.type).filter((value): value is ProvinceType => value !== null))]
  const uniqueTerrains = [...new Set(provinces.map((p) => p.terrain).filter((value): value is string => value !== null))]
  const uniqueContinents = [...new Set(provinces.map((p) => p.continent).filter((value): value is string => value !== null))]

  const [type, setType] = useState(uniqueTypes.length === 1 ? uniqueTypes[0] : '')
  const [terrain, setTerrain] = useState(uniqueTerrains.length === 1 ? uniqueTerrains[0] : '')
  const [continent, setContinent] = useState(uniqueContinents.length === 1 ? uniqueContinents[0] : '')

  const terrainKeys = useMemo(() => [...terrains.keys()].sort(), [terrains])
  const continentKeys = useMemo(() => [...continents.keys()].sort(), [continents])

  return (
    <div className={styles.grid}>
      <span className={styles.label}>IDs</span>
      <Text size={100} className={styles.idText} title={idRanges}>
        {idRanges}
      </Text>

      <span className={styles.label}>Type</span>
      <Select size="small" value={type} onChange={(_, d) => setType(d.value)}>
        <option value="">—</option>
        <option value="land">land</option>
        <option value="sea">sea</option>
        <option value="lake">lake</option>
      </Select>

      <span className={styles.label}>Terrain</span>
      <Select size="small" value={terrain} onChange={(_, d) => setTerrain(d.value)}>
        <option value="">—</option>
        {terrainKeys.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </Select>

      <span className={styles.label}>Continent</span>
      <Select size="small" value={continent} onChange={(_, d) => setContinent(d.value)}>
        <option value="">—</option>
        {continentKeys.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </Select>
    </div>
  )
}

function formatIdRanges(ids: Array<number | null>): string {
  const definedIds = ids.filter((id): id is number => id !== null)
  if (definedIds.length === 0) return 'xxxxx'
  const sorted = [...definedIds].sort((a, b) => a - b)
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

function formatProvinceId(province: ProvinceCatalogEntry): string {
  return province.id === null ? 'xxxxx' : String(province.id)
}
