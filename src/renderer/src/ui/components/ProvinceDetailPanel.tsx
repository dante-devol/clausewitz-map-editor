import { useMemo, useState } from 'react'
import {
  Button,
  Divider,
  Select,
  Tab,
  TabList,
  makeStyles,
  tokens,
  Text,
  shorthands
} from '@fluentui/react-components'
import { ChevronLeftRegular } from '@fluentui/react-icons'
import { unpackColor } from '../../../../shared/mapDataTypes'
import type { Province } from '../../../../shared/mapDataTypes'
import type { ProvinceDraftFields, ProvinceDraftTarget } from '../../../../shared/provinceEditing'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { selectProvinceDraftTargetMaps } from '../../infra/store/provinceEditSelectors'
import { useI18n } from '../i18n/I18nProvider'

const UNSET = '__unset__'
const COASTAL_TRUE = '__true__'
const COASTAL_FALSE = '__false__'

const useStyles = makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground2,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    flex: '1 1 0',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    overflowY: 'auto'
  },
  tabStripRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    minWidth: 0
  },
  tabOverflow: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    flexShrink: 0,
    whiteSpace: 'nowrap'
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

const TAB_SHOW_LIMIT = 5

interface Props {
  onCollapse?: () => void
}

export function ProvinceDetailPanel({ onCollapse }: Props): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()

  const selectedProvinceIds = useMapDataStore((s) => s.selectedProvinceIds)
  const selectedBmpGuids = useMapDataStore((s) => s.selectedBmpGuids)

  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const pendingEdits = useMapDataStore((s) => s.pendingEdits)
  const pendingBmpOnlyEdits = useMapDataStore((s) => s.pendingBmpOnlyEdits)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const pendingNewProvinces = useMapDataStore((s) => s.pendingNewProvinces)
  const bmpOnlyEntries = useMapDataStore((s) => s.bmpOnlyEntries)

  const targetMaps = useMemo(
    () => selectProvinceDraftTargetMaps(
      originalDefinitions,
      pendingEdits,
      pendingBmpOnlyEdits,
      bmpReplacements,
      pendingNewProvinces,
      bmpOnlyEntries
    ),
    [originalDefinitions, pendingEdits, pendingBmpOnlyEdits, bmpReplacements, pendingNewProvinces, bmpOnlyEntries]
  )

  const tabItems = useMemo(() => {
    const items: Array<{ key: string; label: string; target: ProvinceDraftTarget }> = []
    const seen = new Set<string>()

    for (const id of selectedProvinceIds) {
      const target = targetMaps.byProvinceId.get(id)
      if (!target) continue
      const key = `p:${id}`
      if (seen.has(key)) continue
      seen.add(key)
      items.push({ key, label: String(id), target })
    }

    for (const guid of selectedBmpGuids) {
      const target = targetMaps.byBmpGuid.get(guid)
      if (!target) continue
      const key = target.provinceId !== null ? `p:${target.provinceId}` : `b:${guid}`
      if (seen.has(key)) continue
      seen.add(key)
      items.push({ key, label: target.provinceId !== null ? String(target.provinceId) : guid, target })
    }

    return items
  }, [selectedProvinceIds, selectedBmpGuids, targetMaps])

  const [selectedTabKey, setSelectedTabKey] = useState<string | null>(null)

  const effectiveKey = useMemo(() => {
    if (tabItems.length === 0) return null
    const firstKey = tabItems[0].key
    if (selectedTabKey === null) return firstKey
    return tabItems.some((item) => item.key === selectedTabKey) ? selectedTabKey : firstKey
  }, [selectedTabKey, tabItems])

  const focusedTarget = useMemo(
    () => tabItems.find((item) => item.key === effectiveKey)?.target,
    [effectiveKey, tabItems]
  )

  if (tabItems.length === 0) {
    return (
      <div className={styles.root}>
        <div className={styles.tabStripRow}>
          {onCollapse && (
            <Button size="small" appearance="subtle" icon={<ChevronLeftRegular />} onClick={onCollapse} />
          )}
        </div>
        <Text className={styles.empty}>{t('provinceDetail.empty')}</Text>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.tabStripRow}>
        {onCollapse && (
          <Button size="small" appearance="subtle" icon={<ChevronLeftRegular />} onClick={onCollapse} />
        )}
        {tabItems.length > 1 && (
          <TabList
            size="small"
            selectedValue={effectiveKey ?? undefined}
            onTabSelect={(_, data) => setSelectedTabKey(data.value as string)}
          >
            {tabItems.slice(0, TAB_SHOW_LIMIT).map((item) => (
              <Tab key={item.key} value={item.key}>{item.label}</Tab>
            ))}
          </TabList>
        )}
        {tabItems.length > TAB_SHOW_LIMIT && (
          <Text size={100} className={styles.tabOverflow}>+{tabItems.length - TAB_SHOW_LIMIT}</Text>
        )}
      </div>

      {focusedTarget && <SingleDetail target={focusedTarget} />}
    </div>
  )
}

function SingleDetail({ target }: { target: ProvinceDraftTarget }): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()

  const originalDefinitions = useMapDataStore((s) => s.originalDefinitions)
  const bmpReplacements = useMapDataStore((s) => s.bmpReplacements)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const pendingEdits = useMapDataStore((s) => s.pendingEdits)
  const pendingBmpOnlyEdits = useMapDataStore((s) => s.pendingBmpOnlyEdits)
  const editProvince = useMapDataStore((s) => s.editProvince)
  const editBmpOnlyProvince = useMapDataStore((s) => s.editBmpOnlyProvince)
  const revertEdit = useMapDataStore((s) => s.revertEdit)
  const revertBmpOnlyEdit = useMapDataStore((s) => s.revertBmpOnlyEdit)
  const revertBmpReplacement = useMapDataStore((s) => s.revertBmpReplacement)

  const sortedTerrains = useMemo(() => [...terrains.keys()].sort(), [terrains])
  const sortedContinents = useMemo(() => [...continents.keys()].sort(), [continents])
  const original = target.provinceId !== null ? originalDefinitions.get(target.provinceId) : undefined
  const patch = target.provinceId !== null
    ? pendingEdits.get(target.provinceId)
    : (target.bmpGuid ? pendingBmpOnlyEdits.get(target.bmpGuid) : undefined)

  const hasPatch = patch !== undefined
  const hasReplacement = target.provinceId !== null && bmpReplacements.has(target.provinceId)
  const { r, g, b } = unpackColor(target.color)
  const originalColor = original ? unpackColor(original.color) : null

  const setField = (field: keyof ProvinceDraftFields, value: ProvinceDraftFields[keyof ProvinceDraftFields]) => {
    if (target.provinceId !== null) editProvince(target.provinceId, { [field]: value })
    else if (target.bmpGuid) editBmpOnlyProvince(target.bmpGuid, { [field]: value })
  }

  return (
    <>
      <div className={styles.grid}>
        <span className={styles.label}>
          {target.provinceId !== null ? t('provinceDetail.id') : t('provinceDetail.bmpGuid')}
        </span>
        <span className={styles.idText}>{target.provinceId !== null ? String(target.provinceId) : (target.bmpGuid ?? '—')}</span>

        <span className={styles.label}>{t('provinceEdit.color.label')}</span>
        <div className={styles.fieldCell}>
          <div className={styles.colorRow}>
            {hasReplacement && originalColor ? (
              <>
                <div className={styles.swatchOrig} style={{ backgroundColor: `rgb(${originalColor.r},${originalColor.g},${originalColor.b})` }} />
                <span className={styles.swatchArrow}>→</span>
              </>
            ) : null}
            <div className={styles.swatch} style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
            <Text size={100} className={styles.colorLabel}>
              {hasReplacement ? t('provinceEdit.color.bmpAssigned') : formatHexColor(r, g, b)}
            </Text>
          </div>
        </div>

        <span className={styles.label}>{t('provinceEdit.type.label')}</span>
        <div className={styles.fieldCell}>
          <Select
            size="small"
            value={target.type ?? UNSET}
            onChange={(_, data) => setField('type', data.value === UNSET ? undefined : data.value as Province['type'])}
          >
            <option value={UNSET}>{t('provinceEdit.noneOption')}</option>
            <option value="land">land</option>
            <option value="sea">sea</option>
            <option value="lake">lake</option>
          </Select>
          {showOriginalValue(patch, 'type', original?.type) && (
            <Text size={100} className={styles.original}>{t('provinceEdit.original', { value: original?.type ?? t('provinceEdit.noneOption') })}</Text>
          )}
        </div>

        <span className={styles.label}>{t('provinceEdit.terrain.label')}</span>
        <div className={styles.fieldCell}>
          <Select
            size="small"
            value={target.terrain ?? UNSET}
            onChange={(_, data) => setField('terrain', data.value === UNSET ? undefined : data.value)}
          >
            <option value={UNSET}>{t('provinceEdit.noneOption')}</option>
            {sortedTerrains.map((name) => <option key={name} value={name}>{name}</option>)}
          </Select>
          {showOriginalValue(patch, 'terrain', original?.terrain) && (
            <Text size={100} className={styles.original}>{t('provinceEdit.original', { value: original?.terrain ?? t('provinceEdit.noneOption') })}</Text>
          )}
        </div>

        <span className={styles.label}>{t('provinceEdit.coastal.label')}</span>
        <div className={styles.fieldCell}>
          <Select
            size="small"
            value={serializeCoastal(target.isCoastal)}
            onChange={(_, data) => setField('isCoastal', deserializeCoastal(data.value))}
          >
            <option value={UNSET}>{t('provinceEdit.noneOption')}</option>
            <option value={COASTAL_TRUE}>{t('provinceEdit.coastal.yes')}</option>
            <option value={COASTAL_FALSE}>{t('provinceEdit.coastal.no')}</option>
          </Select>
          {showOriginalValue(patch, 'isCoastal', original?.isCoastal) && (
            <Text size={100} className={styles.original}>
              {t('provinceEdit.original', {
                value: original?.isCoastal === undefined
                  ? t('provinceEdit.noneOption')
                  : (original.isCoastal ? t('provinceEdit.coastal.yes') : t('provinceEdit.coastal.no'))
              })}
            </Text>
          )}
        </div>

        <span className={styles.label}>{t('provinceEdit.continent.label')}</span>
        <div className={styles.fieldCell}>
          <Select
            size="small"
            value={target.continent ?? UNSET}
            onChange={(_, data) => setField('continent', data.value === UNSET ? undefined : data.value)}
          >
            <option value={UNSET}>{t('provinceEdit.noneOption')}</option>
            <option value="">{t('provinceEdit.noneOption')}</option>
            {sortedContinents.map((name) => <option key={name} value={name}>{name}</option>)}
          </Select>
          {showOriginalValue(patch, 'continent', original?.continent) && (
            <Text size={100} className={styles.original}>
              {t('provinceEdit.original', { value: original?.continent || t('provinceEdit.noneOption') })}
            </Text>
          )}
        </div>
      </div>

      {(hasPatch || hasReplacement) && (
        <>
          <Divider />
          <div className={styles.revertRow}>
            {hasPatch && (
              <Button
                size="small"
                appearance="subtle"
                className={styles.revertButton}
                onClick={() => {
                  if (target.provinceId !== null) revertEdit(target.provinceId)
                  else if (target.bmpGuid) revertBmpOnlyEdit(target.bmpGuid)
                }}
              >
                {t('provinceEdit.revertFields')}
              </Button>
            )}
            {hasReplacement && target.provinceId !== null && (
              <Button
                size="small"
                appearance="subtle"
                className={styles.revertButton}
                onClick={() => revertBmpReplacement(target.provinceId!)}
              >
                {t('provinceEdit.revertColor')}
              </Button>
            )}
          </div>
        </>
      )}
    </>
  )
}

function showOriginalValue(
  patch: Partial<ProvinceDraftFields> | ProvinceDraftFields | undefined,
  field: keyof ProvinceDraftFields,
  originalValue: string | boolean | undefined
): boolean {
  return patch !== undefined
    && Object.prototype.hasOwnProperty.call(patch, field)
    && patch[field] !== originalValue
}

function formatHexColor(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')
}

function serializeCoastal(value: boolean | undefined): string {
  if (value === undefined) return UNSET
  return value ? COASTAL_TRUE : COASTAL_FALSE
}

function deserializeCoastal(value: string): boolean | undefined {
  if (value === UNSET) return undefined
  return value === COASTAL_TRUE
}
