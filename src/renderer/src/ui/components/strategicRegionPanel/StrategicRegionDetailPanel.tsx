import { useState, useEffect, useCallback } from 'react'
import {
  makeStyles,
  tokens,
  Button,
  Input,
  Text,
  Tooltip,
  Spinner,
  Select
} from '@fluentui/react-components'
import {
  ChevronDownRegular,
  ChevronUpRegular,
  DismissRegular,
  AddRegular,
  ArrowResetRegular
} from '@fluentui/react-icons'
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { useCoreStore } from '../../../infra/store/coreStore'
import type { WeatherPeriod } from '../../../../../shared/mapDataTypes'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '300px',
    maxWidth: '480px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0
  },
  headerTitle: {
    flex: 1,
    minWidth: 0
  },
  sourcePath: {
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '200px'
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    flex: 1
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`
  },
  nameLabel: {
    flexShrink: 0,
    color: tokens.colorNeutralForeground2,
    width: '48px'
  },
  nameInput: {
    flex: 1
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    cursor: 'pointer',
    userSelect: 'none',
    flexShrink: 0,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground2
    }
  },
  sectionTitle: {
    flex: 1
  },
  chevron: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3
  },
  sectionBody: {
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXXS
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    padding: `2px ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    fontFamily: 'monospace'
  },
  chipRemove: {
    cursor: 'pointer',
    display: 'inline-flex',
    color: tokens.colorNeutralForeground3,
    '&:hover': { color: tokens.colorStatusDangerForeground1 }
  },
  addRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    alignItems: 'center'
  },
  addInput: {
    flex: 1
  },
  emptyText: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic'
  },
  periodCard: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden'
  },
  periodHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
    backgroundColor: tokens.colorNeutralBackground2,
    cursor: 'pointer',
    userSelect: 'none',
    '&:hover': { backgroundColor: tokens.colorNeutralBackground3 }
  },
  periodTitle: {
    flex: 1
  },
  periodBody: {
    padding: tokens.spacingVerticalXS,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS
  },
  fieldLabel: {
    width: '100px',
    flexShrink: 0,
    color: tokens.colorNeutralForeground2
  },
  floatInput: {
    width: '72px'
  },
  weightRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS
  },
  weightKey: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase100
  },
  weightVal: {
    width: '64px',
    flexShrink: 0
  },
  weightsSection: {
    marginTop: tokens.spacingVerticalXS
  },
  periodActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: tokens.spacingVerticalXXS
  },
  addWeightRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    alignItems: 'center',
    marginTop: tokens.spacingVerticalXXS
  },
  addWeightSelect: {
    flex: 1
  },
  addPeriodRow: {
    paddingTop: tokens.spacingVerticalXS
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground3
  },
  collapseBtn: {
    flexShrink: 0
  }
})

interface Props {
  onCollapse: () => void
}

export function StrategicRegionDetailPanel({ onCollapse }: Props): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const projectId = useCoreStore((s) => s.projectId)

  const selectedStrategicRegionId = useMapDataStore((s) => s.selectedStrategicRegionId)
  const strategicRegionsById = useMapDataStore((s) => s.strategicRegionsById)
  const pendingStrategicRegionEdits = useMapDataStore((s) => s.pendingStrategicRegionEdits)
  const editStrategicRegion = useMapDataStore((s) => s.editStrategicRegion)
  const revertStrategicRegionEdit = useMapDataStore((s) => s.revertStrategicRegionEdit)

  const [provincesOpen, setProvincesOpen] = useState(true)
  const [weatherOpen, setWeatherOpen] = useState(false)
  const [expandedPeriods, setExpandedPeriods] = useState<Set<number>>(new Set())

  const [addProvinceInput, setAddProvinceInput] = useState('')

  // Lazy weather entries loading
  const [weatherEntries, setWeatherEntries] = useState<string[] | null>(null)
  const [weatherEntriesLoading, setWeatherEntriesLoading] = useState(false)
  const [addWeightKey, setAddWeightKey] = useState('')
  const [addWeightValue, setAddWeightValue] = useState('')

  const region = selectedStrategicRegionId !== null ? strategicRegionsById.get(selectedStrategicRegionId) : null
  const patch = selectedStrategicRegionId !== null ? pendingStrategicRegionEdits.get(selectedStrategicRegionId) : undefined

  const effectiveName = patch?.name ?? region?.name ?? ''
  const effectiveProvinceIds = patch?.provinceIds ?? region?.provinceIds ?? []
  const effectiveWeatherPeriods = patch?.weatherPeriods ?? region?.weatherPeriods ?? []

  const loadWeatherEntries = useCallback(async () => {
    if (!projectId || weatherEntries !== null || weatherEntriesLoading) return
    setWeatherEntriesLoading(true)
    try {
      const entries = await window.api.map.loadWeatherEntries(projectId)
      setWeatherEntries(entries)
      if (entries.length > 0) setAddWeightKey(entries[0])
    } catch {
      setWeatherEntries([])
    } finally {
      setWeatherEntriesLoading(false)
    }
  }, [projectId, weatherEntries, weatherEntriesLoading])

  const handleWeatherToggle = () => {
    const next = !weatherOpen
    setWeatherOpen(next)
    if (next && weatherEntries === null) void loadWeatherEntries()
  }

  // Reset add-province input when selection changes
  useEffect(() => {
    setAddProvinceInput('')
    setExpandedPeriods(new Set())
  }, [selectedStrategicRegionId])

  if (!region) {
    return (
      <div className={styles.root}>
        <div className={styles.header}>
          <Text size={200} className={styles.headerTitle}>{t('stratRegionPanel.detail.noSelection')}</Text>
          <Button size="small" appearance="subtle" icon={<ChevronDownRegular />} onClick={onCollapse} />
        </div>
      </div>
    )
  }

  const hasPatch = patch !== undefined

  // — Province helpers —
  const handleAddProvince = () => {
    const id = parseInt(addProvinceInput.trim(), 10)
    if (Number.isNaN(id) || effectiveProvinceIds.includes(id)) { setAddProvinceInput(''); return }
    editStrategicRegion(region.id, { provinceIds: [...effectiveProvinceIds, id] })
    setAddProvinceInput('')
  }

  const handleRemoveProvince = (id: number) => {
    editStrategicRegion(region.id, { provinceIds: effectiveProvinceIds.filter((p) => p !== id) })
  }

  // — Weather period helpers —
  const updatePeriod = (index: number, updated: WeatherPeriod) => {
    const next = effectiveWeatherPeriods.map((p, i) => i === index ? updated : p)
    editStrategicRegion(region.id, { weatherPeriods: next })
  }

  const removePeriod = (index: number) => {
    editStrategicRegion(region.id, { weatherPeriods: effectiveWeatherPeriods.filter((_, i) => i !== index) })
    setExpandedPeriods((prev) => {
      const s = new Set(prev)
      s.delete(index)
      return s
    })
  }

  const addPeriod = () => {
    const newPeriod: WeatherPeriod = { between: [0, 30], temperature: [0, 10], weatherWeights: {} }
    const newIndex = effectiveWeatherPeriods.length
    editStrategicRegion(region.id, { weatherPeriods: [...effectiveWeatherPeriods, newPeriod] })
    setExpandedPeriods((prev) => new Set([...prev, newIndex]))
  }

  const addWeight = (periodIndex: number) => {
    if (!addWeightKey || addWeightValue === '') return
    const val = parseFloat(addWeightValue)
    if (Number.isNaN(val)) return
    const period = effectiveWeatherPeriods[periodIndex]
    updatePeriod(periodIndex, {
      ...period,
      weatherWeights: { ...period.weatherWeights, [addWeightKey]: val }
    })
    setAddWeightValue('')
  }

  const removeWeight = (periodIndex: number, key: string) => {
    const period = effectiveWeatherPeriods[periodIndex]
    const { [key]: _, ...rest } = period.weatherWeights
    updatePeriod(periodIndex, { ...period, weatherWeights: rest })
  }

  const togglePeriod = (i: number) => {
    setExpandedPeriods((prev) => {
      const s = new Set(prev)
      if (s.has(i)) s.delete(i)
      else s.add(i)
      return s
    })
  }

  const formatFloat = (v: number) => {
    const s = v.toString()
    return s.includes('.') ? s : `${s}.0`
  }

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Text size={200} weight="semibold">{t('stratRegionPanel.detail.title', { id: region.id })}</Text>
          {region.sourcePath && (
            <Text size={100} className={styles.sourcePath} title={region.sourcePath}>
              {t('stratRegionPanel.detail.sourcePath')}: {region.sourcePath.split(/[\\/]/).pop()}
            </Text>
          )}
        </div>
        {hasPatch && (
          <Tooltip content={t('stratRegionPanel.detail.revert')} relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowResetRegular />}
              onClick={() => revertStrategicRegionEdit(region.id)}
            />
          </Tooltip>
        )}
        <Button size="small" appearance="subtle" icon={<ChevronDownRegular />} className={styles.collapseBtn} onClick={onCollapse} />
      </div>

      <div className={styles.body}>
        {/* Name */}
        <div className={styles.nameRow}>
          <Text size={100} className={styles.nameLabel}>{t('stratRegionPanel.detail.name')}</Text>
          <Input
            size="small"
            className={styles.nameInput}
            value={effectiveName}
            onChange={(_, d) => editStrategicRegion(region.id, { name: d.value })}
          />
        </div>

        {/* Provinces section */}
        <div className={styles.sectionHeader} onClick={() => setProvincesOpen((o) => !o)}>
          <Text size={100} weight="semibold" className={styles.sectionTitle}>
            {t('stratRegionPanel.section.provinces')} ({effectiveProvinceIds.length})
          </Text>
          {provincesOpen
            ? <ChevronUpRegular className={styles.chevron} />
            : <ChevronDownRegular className={styles.chevron} />}
        </div>

        {provincesOpen && (
          <div className={styles.sectionBody}>
            {effectiveProvinceIds.length === 0 ? (
              <Text size={100} className={styles.emptyText}>{t('stratRegionPanel.section.noProvinces')}</Text>
            ) : (
              <div className={styles.chipRow}>
                {effectiveProvinceIds.map((id) => (
                  <span key={id} className={styles.chip}>
                    {id}
                    <span
                      className={styles.chipRemove}
                      role="button"
                      tabIndex={0}
                      aria-label={`Remove province ${id}`}
                      onClick={() => handleRemoveProvince(id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRemoveProvince(id) }}
                    >
                      <DismissRegular style={{ fontSize: '10px' }} />
                    </span>
                  </span>
                ))}
              </div>
            )}
            <div className={styles.addRow}>
              <Input
                size="small"
                className={styles.addInput}
                placeholder={t('stratRegionPanel.add.provinceId')}
                value={addProvinceInput}
                onChange={(_, d) => setAddProvinceInput(d.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddProvince() }}
              />
              <Button size="small" onClick={handleAddProvince}>{t('stratRegionPanel.add.confirm')}</Button>
            </div>
          </div>
        )}

        {/* Weather section */}
        <div className={styles.sectionHeader} onClick={handleWeatherToggle}>
          <Text size={100} weight="semibold" className={styles.sectionTitle}>
            {t('stratRegionPanel.section.weather')} ({effectiveWeatherPeriods.length})
          </Text>
          {weatherOpen
            ? <ChevronUpRegular className={styles.chevron} />
            : <ChevronDownRegular className={styles.chevron} />}
        </div>

        {weatherOpen && (
          <div className={styles.sectionBody}>
            {weatherEntriesLoading && (
              <div className={styles.loadingRow}>
                <Spinner size="extra-tiny" />
                <Text size={100}>{t('stratRegionPanel.weather.loading')}</Text>
              </div>
            )}
            {effectiveWeatherPeriods.length === 0 && !weatherEntriesLoading && (
              <Text size={100} className={styles.emptyText}>{t('stratRegionPanel.section.noWeather')}</Text>
            )}
            {effectiveWeatherPeriods.map((period, i) => (
              <div key={i} className={styles.periodCard}>
                <div className={styles.periodHeader} onClick={() => togglePeriod(i)}>
                  <Text size={100} weight="semibold" className={styles.periodTitle}>
                    {t('stratRegionPanel.weather.period', { n: i + 1 })}
                    {' '}
                    <span style={{ fontWeight: 'normal', color: tokens.colorNeutralForeground3 }}>
                      {formatFloat(period.between[0])}–{formatFloat(period.between[1])}
                    </span>
                  </Text>
                  {expandedPeriods.has(i)
                    ? <ChevronUpRegular className={styles.chevron} />
                    : <ChevronDownRegular className={styles.chevron} />}
                </div>

                {expandedPeriods.has(i) && (
                  <div className={styles.periodBody}>
                    {/* Between */}
                    <div className={styles.fieldRow}>
                      <Text size={100} className={styles.fieldLabel}>{t('stratRegionPanel.weather.between')}</Text>
                      <Input
                        size="small"
                        className={styles.floatInput}
                        value={String(period.between[0])}
                        placeholder={t('stratRegionPanel.weather.start')}
                        onChange={(_, d) => {
                          const v = parseFloat(d.value)
                          if (!Number.isNaN(v)) updatePeriod(i, { ...period, between: [v, period.between[1]] })
                        }}
                      />
                      <Text size={100}>–</Text>
                      <Input
                        size="small"
                        className={styles.floatInput}
                        value={String(period.between[1])}
                        placeholder={t('stratRegionPanel.weather.end')}
                        onChange={(_, d) => {
                          const v = parseFloat(d.value)
                          if (!Number.isNaN(v)) updatePeriod(i, { ...period, between: [period.between[0], v] })
                        }}
                      />
                    </div>

                    {/* Temperature */}
                    <div className={styles.fieldRow}>
                      <Text size={100} className={styles.fieldLabel}>{t('stratRegionPanel.weather.temperature')}</Text>
                      <Input
                        size="small"
                        className={styles.floatInput}
                        value={String(period.temperature[0])}
                        placeholder={t('stratRegionPanel.weather.min')}
                        onChange={(_, d) => {
                          const v = parseFloat(d.value)
                          if (!Number.isNaN(v)) updatePeriod(i, { ...period, temperature: [v, period.temperature[1]] })
                        }}
                      />
                      <Text size={100}>–</Text>
                      <Input
                        size="small"
                        className={styles.floatInput}
                        value={String(period.temperature[1])}
                        placeholder={t('stratRegionPanel.weather.max')}
                        onChange={(_, d) => {
                          const v = parseFloat(d.value)
                          if (!Number.isNaN(v)) updatePeriod(i, { ...period, temperature: [period.temperature[0], v] })
                        }}
                      />
                    </div>

                    {/* Min Snow Level */}
                    <div className={styles.fieldRow}>
                      <Text size={100} className={styles.fieldLabel}>{t('stratRegionPanel.weather.minSnowLevel')}</Text>
                      <Input
                        size="small"
                        className={styles.floatInput}
                        value={period.minSnowLevel !== undefined ? String(period.minSnowLevel) : ''}
                        placeholder="0.0"
                        onChange={(_, d) => {
                          if (d.value === '') {
                            const { minSnowLevel: _, ...rest } = period
                            updatePeriod(i, rest as WeatherPeriod)
                          } else {
                            const v = parseFloat(d.value)
                            if (!Number.isNaN(v)) updatePeriod(i, { ...period, minSnowLevel: v })
                          }
                        }}
                      />
                    </div>

                    {/* Weather weights */}
                    <div className={styles.weightsSection}>
                      {Object.entries(period.weatherWeights).map(([key, val]) => (
                        <div key={key} className={styles.weightRow}>
                          <Text size={100} className={styles.weightKey}>{key}</Text>
                          <Input
                            size="small"
                            className={styles.weightVal}
                            value={String(val)}
                            onChange={(_, d) => {
                              const v = parseFloat(d.value)
                              if (!Number.isNaN(v)) {
                                updatePeriod(i, { ...period, weatherWeights: { ...period.weatherWeights, [key]: v } })
                              }
                            }}
                          />
                          <Button
                            size="small"
                            appearance="subtle"
                            icon={<DismissRegular />}
                            onClick={() => removeWeight(i, key)}
                          />
                        </div>
                      ))}

                      {/* Add weight row */}
                      {weatherEntries !== null && weatherEntries.length > 0 && (
                        <div className={styles.addWeightRow}>
                          <Select
                            size="small"
                            className={styles.addWeightSelect}
                            value={addWeightKey}
                            onChange={(_, d) => setAddWeightKey(d.value)}
                          >
                            {weatherEntries.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </Select>
                          <Input
                            size="small"
                            className={styles.weightVal}
                            value={addWeightValue}
                            placeholder="0.0"
                            onChange={(_, d) => setAddWeightValue(d.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addWeight(i) }}
                          />
                          <Button size="small" icon={<AddRegular />} onClick={() => addWeight(i)}>
                            {t('stratRegionPanel.weather.addWeight')}
                          </Button>
                        </div>
                      )}
                      {weatherEntries !== null && weatherEntries.length === 0 && (
                        <Text size={100} className={styles.emptyText}>{t('stratRegionPanel.section.noWeatherEntries')}</Text>
                      )}
                    </div>

                    {/* Period actions */}
                    <div className={styles.periodActions}>
                      <Button
                        size="small"
                        appearance="subtle"
                        icon={<DismissRegular />}
                        onClick={() => removePeriod(i)}
                      >
                        {t('stratRegionPanel.weather.removePeriod')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className={styles.addPeriodRow}>
              <Button size="small" icon={<AddRegular />} onClick={addPeriod}>
                {t('stratRegionPanel.weather.addPeriod')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
