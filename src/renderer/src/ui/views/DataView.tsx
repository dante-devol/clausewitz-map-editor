import { useState } from 'react'
import {
  makeStyles,
  tokens,
  Tab,
  TabList,
  Text,
  Badge
} from '@fluentui/react-components'
import { useI18n } from '../i18n/I18nProvider'
import type { MessageKey } from '../i18n/messages/en'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { unpackColor } from '../../../../shared/mapDataTypes'
import { useProvinceValidationStore } from '../../infra/store/provinceValidationStore'
import { VirtualTable, type VirtualTableColumn } from '../components/dataTable/VirtualTable'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    height: '100%',
    padding: tokens.spacingVerticalM
  },
  swatch: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    borderRadius: '2px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    verticalAlign: 'middle',
    marginRight: '4px'
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS
  },
  statusText: {
    color: tokens.colorNeutralForeground2
  }
})

const PROVINCE_ID_PREVIEW_CAP = 24

function Swatch({ color }: { color: number }) {
  const { r, g, b } = unpackColor(color)
  const styles = useStyles()
  return (
    <span
      className={styles.swatch}
      style={{ backgroundColor: `rgb(${r},${g},${b})` }}
      title={`rgb(${r}, ${g}, ${b})`}
    />
  )
}

function ProvincesTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const rows = useMapDataStore((s) => s.provinceCatalog)

  const columns: VirtualTableColumn<(typeof rows)[number]>[] = [
    { key: 'id', header: t('debug.column.id'), width: '80px', render: (p) => p.id ?? 'xxxxx' },
    {
      key: 'color',
      header: t('debug.column.color'),
      width: '160px',
      render: (p) => {
        if (p.color === null) return '—'
        const { r, g, b } = unpackColor(p.color)
        return (
          <>
            <Swatch color={p.color} />
            {r}, {g}, {b}
          </>
        )
      }
    },
    { key: 'type', header: t('debug.column.type'), width: '110px', render: (p) => p.type ?? '—' },
    { key: 'coastal', header: t('debug.column.coastal'), width: '90px', render: (p) => (p.isCoastal ? '✓' : '—') },
    { key: 'terrain', header: t('debug.column.terrain'), width: '140px', render: (p) => p.terrain || '—' },
    { key: 'continent', header: t('debug.column.continent'), width: '140px', render: (p) => p.continent || '—' }
  ]

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color="informative">{formatNumber(rows.length)}</Badge>
        <Text size={200}>{t('debug.provincesLoaded', { count: formatNumber(rows.length) })}</Text>
      </div>
      <VirtualTable columns={columns} rows={rows} getRowKey={(p) => p.key} />
    </>
  )
}

function TerrainsTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const terrains = useMapDataStore((s) => s.terrains)
  const rows = Array.from(terrains.values())

  const columns: VirtualTableColumn<(typeof rows)[number]>[] = [
    { key: 'codeName', header: t('debug.column.codeName'), width: '220px', render: (row) => row.codeName },
    {
      key: 'color',
      header: t('debug.column.color'),
      width: '160px',
      render: (row) => {
        const { r, g, b } = unpackColor(row.color)
        return (
          <>
            <Swatch color={row.color} />
            {r}, {g}, {b}
          </>
        )
      }
    }
  ]

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color="informative">{formatNumber(rows.length)}</Badge>
        <Text size={200}>{t('debug.terrainCategoriesLoaded', { count: formatNumber(rows.length) })}</Text>
      </div>
      <VirtualTable columns={columns} rows={rows} getRowKey={(row) => row.codeName} />
    </>
  )
}

function ContinentsTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const continents = useMapDataStore((s) => s.continents)
  const rows = Array.from(continents.values()).sort((a, b) => a.position - b.position)

  const columns: VirtualTableColumn<(typeof rows)[number]>[] = [
    { key: 'position', header: t('debug.column.position'), width: '100px', render: (row) => row.position },
    { key: 'codeName', header: t('debug.column.codeName'), width: 'minmax(200px, 1fr)', render: (row) => row.codeName }
  ]

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color="informative">{formatNumber(rows.length)}</Badge>
        <Text size={200}>{t('debug.continentsLoaded', { count: formatNumber(rows.length) })}</Text>
      </div>
      <VirtualTable columns={columns} rows={rows} getRowKey={(row) => row.codeName} />
    </>
  )
}

function StatesTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const rows = useMapDataStore((s) => s.states)
  const status = useMapDataStore((s) => s.statesStatus)

  const columns: VirtualTableColumn<(typeof rows)[number]>[] = [
    { key: 'id', header: t('debug.column.id'), width: '70px', render: (state) => state.id },
    { key: 'name', header: t('debug.column.name'), width: '200px', render: (state) => state.displayName || '—' },
    { key: 'stateCategory', header: t('debug.column.stateCategory'), width: '160px', render: (state) => state.stateCategory || '—' },
    { key: 'manpower', header: t('debug.column.manpower'), width: '110px', render: (state) => formatNumber(state.manpower) },
    { key: 'owner', header: t('debug.column.owner'), width: '90px', render: (state) => state.history.owner ?? '—' },
    { key: 'provinceCount', header: t('debug.column.provinceCount'), width: '110px', render: (state) => formatNumber(state.provinceIds.length) },
    { key: 'provinces', header: t('debug.column.provinces'), width: 'minmax(300px, 1fr)', render: (state) => formatProvincePreview(state.provinceIds) }
  ]

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color={statusToBadgeColor(status)}>{formatNumber(rows.length)}</Badge>
        <Text size={200}>{t('debug.statesLoaded', { count: formatNumber(rows.length) })}</Text>
        <Text size={200} className={styles.statusText}>
          {t('debug.datasetStatus', { status: t(`debug.datasetState.${status}`) })}
        </Text>
      </div>
      <VirtualTable columns={columns} rows={rows} getRowKey={(state) => state.id} />
    </>
  )
}

function StateCategoriesTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const stateCategories = useMapDataStore((s) => s.stateCategories)
  const rows = Array.from(stateCategories.values())

  const columns: VirtualTableColumn<(typeof rows)[number]>[] = [
    { key: 'codeName', header: t('debug.column.codeName'), width: '220px', render: (cat) => cat.codeName },
    { key: 'localBuildingSlots', header: t('debug.column.localBuildingSlots'), width: '180px', render: (cat) => cat.localBuildingSlots },
    {
      key: 'color',
      header: t('debug.column.color'),
      width: '160px',
      render: (cat) => {
        const { r, g, b } = unpackColor(cat.color)
        return (
          <>
            <Swatch color={cat.color} />
            {r}, {g}, {b}
          </>
        )
      }
    }
  ]

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color="informative">{formatNumber(rows.length)}</Badge>
        <Text size={200}>{t('debug.stateCategoriesLoaded', { count: formatNumber(rows.length) })}</Text>
      </div>
      <VirtualTable columns={columns} rows={rows} getRowKey={(cat) => cat.codeName} />
    </>
  )
}

function BuildingsTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const buildings = useMapDataStore((s) => s.buildings)
  const rows = Array.from(buildings.values())

  const columns: VirtualTableColumn<(typeof rows)[number]>[] = [
    { key: 'codeName', header: t('debug.column.codeName'), width: '220px', render: (b) => b.codeName },
    { key: 'sharesSlots', header: t('debug.column.sharesSlots'), width: '140px', render: (b) => (b.levelCap.sharesSlots ? '✓' : '—') },
    { key: 'provinceMax', header: t('debug.column.provinceMax'), width: '140px', render: (b) => b.levelCap.provinceMax ?? '—' },
    { key: 'stateMax', header: t('debug.column.stateMax'), width: '140px', render: (b) => b.levelCap.stateMax ?? '—' }
  ]

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color="informative">{formatNumber(rows.length)}</Badge>
        <Text size={200}>{t('debug.buildingsLoaded', { count: formatNumber(rows.length) })}</Text>
      </div>
      <VirtualTable columns={columns} rows={rows} getRowKey={(b) => b.codeName} />
    </>
  )
}

function StrategicRegionsTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const rows = useMapDataStore((s) => s.strategicRegions)
  const status = useMapDataStore((s) => s.strategicRegionsStatus)

  const columns: VirtualTableColumn<(typeof rows)[number]>[] = [
    { key: 'id', header: t('debug.column.id'), width: '70px', render: (region) => region.id },
    { key: 'name', header: t('debug.column.name'), width: '200px', render: (region) => region.displayName || '—' },
    { key: 'weatherPeriods', header: t('debug.column.weatherPeriods'), width: '150px', render: (region) => formatNumber(region.weatherPeriods?.length ?? 0) },
    { key: 'provinceCount', header: t('debug.column.provinceCount'), width: '140px', render: (region) => formatNumber(region.provinceIds.length) },
    { key: 'provinces', header: t('debug.column.provinces'), width: 'minmax(300px, 1fr)', render: (region) => formatProvincePreview(region.provinceIds) }
  ]

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color={statusToBadgeColor(status)}>{formatNumber(rows.length)}</Badge>
        <Text size={200}>{t('debug.strategicRegionsLoaded', { count: formatNumber(rows.length) })}</Text>
        <Text size={200} className={styles.statusText}>
          {t('debug.datasetStatus', { status: t(`debug.datasetState.${status}`) })}
        </Text>
      </div>
      <VirtualTable columns={columns} rows={rows} getRowKey={(region) => region.id} />
    </>
  )
}

function ValidationTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const status = useProvinceValidationStore((s) => s.status)
  const phase = useProvinceValidationStore((s) => s.phase)
  const rows = useProvinceValidationStore((s) => s.issues)
  const summary = useProvinceValidationStore((s) => s.summary)

  const columns: VirtualTableColumn<(typeof rows)[number]>[] = [
    { key: 'severity', header: t('debug.column.severity'), width: '100px', render: (issue) => issue.severity },
    { key: 'id', header: t('debug.column.id'), width: '80px', render: (issue) => issue.provinceId ?? 'xxxxx' },
    { key: 'codeName', header: t('debug.column.codeName'), width: '220px', render: (issue) => issue.code },
    {
      key: 'message',
      header: t('debug.column.message'),
      width: 'minmax(300px, 1fr)',
      render: (issue) => t(issue.code as MessageKey, issue.messageParams)
    }
  ]

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color="danger">{formatNumber(summary.errorCount)}</Badge>
        <Badge appearance="filled" color="warning">{formatNumber(summary.warningCount)}</Badge>
        <Badge appearance="filled" color="informative">{formatNumber(summary.infoCount)}</Badge>
        <Text size={200}>{t('debug.validationIssues', { count: formatNumber(rows.length) })}</Text>
        <Text size={200} className={styles.statusText}>
          {t('debug.validationStatus', {
            status: t(`debug.validationState.${status}`),
            phase: phase ? t(`debug.validationPhase.${phase}`) : '—'
          })}
        </Text>
      </div>
      <VirtualTable columns={columns} rows={rows} getRowKey={(issue, i) => `${issue.provinceKey}:${issue.code}:${i}`} />
    </>
  )
}

function LocalisationTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const localisationEntries = useMapDataStore((s) => s.localisationEntries)
  const rows = Object.entries(localisationEntries)

  const columns: VirtualTableColumn<(typeof rows)[number]>[] = [
    { key: 'key', header: t('debug.column.key'), width: '280px', render: ([key]) => key },
    { key: 'value', header: t('debug.column.value'), width: 'minmax(300px, 1fr)', render: ([, value]) => value }
  ]

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color="informative">{formatNumber(rows.length)}</Badge>
        <Text size={200}>{t('debug.localisationEntriesLoaded', { count: formatNumber(rows.length) })}</Text>
      </div>
      <VirtualTable columns={columns} rows={rows} getRowKey={([key]) => key} />
    </>
  )
}

type TabId = 'provinces' | 'terrain' | 'continents' | 'states' | 'strategicRegions' | 'stateCategories' | 'buildings' | 'localisation' | 'validation'

export function DataView() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const [tab, setTab] = useState<TabId>('provinces')

  const provinceCatalog = useMapDataStore((s) => s.provinceCatalog)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const states = useMapDataStore((s) => s.states)
  const strategicRegions = useMapDataStore((s) => s.strategicRegions)
  const stateCategories = useMapDataStore((s) => s.stateCategories)
  const buildings = useMapDataStore((s) => s.buildings)
  const localisationEntries = useMapDataStore((s) => s.localisationEntries)
  const validationSummary = useProvinceValidationStore((s) => s.summary)

  return (
    <div className={styles.root}>
      <TabList
        selectedValue={tab}
        onTabSelect={(_, d) => setTab(d.value as TabId)}
      >
        <Tab value="provinces">
          {t('debug.tab.provinces')} <Badge appearance="tint">{formatNumber(provinceCatalog.length)}</Badge>
        </Tab>
        <Tab value="terrain">
          {t('debug.tab.terrain')} <Badge appearance="tint">{formatNumber(terrains.size)}</Badge>
        </Tab>
        <Tab value="continents">
          {t('debug.tab.continents')} <Badge appearance="tint">{formatNumber(continents.size)}</Badge>
        </Tab>
        <Tab value="states">
          {t('debug.tab.states')} <Badge appearance="tint">{formatNumber(states.length)}</Badge>
        </Tab>
        <Tab value="strategicRegions">
          {t('debug.tab.strategicRegions')} <Badge appearance="tint">{formatNumber(strategicRegions.length)}</Badge>
        </Tab>
        <Tab value="stateCategories">
          {t('debug.tab.stateCategories')} <Badge appearance="tint">{formatNumber(stateCategories.size)}</Badge>
        </Tab>
        <Tab value="buildings">
          {t('debug.tab.buildings')} <Badge appearance="tint">{formatNumber(buildings.size)}</Badge>
        </Tab>
        <Tab value="localisation">
          {t('debug.tab.localisation')} <Badge appearance="tint">{formatNumber(Object.keys(localisationEntries).length)}</Badge>
        </Tab>
        <Tab value="validation">
          {t('debug.tab.validation')} <Badge appearance="tint">{formatNumber(validationSummary.errorCount + validationSummary.warningCount + validationSummary.infoCount)}</Badge>
        </Tab>
      </TabList>
      {tab === 'provinces' && <ProvincesTab />}
      {tab === 'terrain' && <TerrainsTab />}
      {tab === 'continents' && <ContinentsTab />}
      {tab === 'states' && <StatesTab />}
      {tab === 'strategicRegions' && <StrategicRegionsTab />}
      {tab === 'stateCategories' && <StateCategoriesTab />}
      {tab === 'buildings' && <BuildingsTab />}
      {tab === 'localisation' && <LocalisationTab />}
      {tab === 'validation' && <ValidationTab />}
    </div>
  )
}

function formatProvincePreview(provinceIds: number[]): string {
  if (provinceIds.length === 0) return '—'
  const preview = provinceIds.slice(0, PROVINCE_ID_PREVIEW_CAP).join(', ')
  return provinceIds.length > PROVINCE_ID_PREVIEW_CAP
    ? `${preview} …`
    : preview
}

function statusToBadgeColor(status: 'idle' | 'loading' | 'ready' | 'error'): 'informative' | 'important' | 'success' | 'danger' {
  if (status === 'idle') return 'important'
  if (status === 'loading') return 'informative'
  if (status === 'ready') return 'success'
  return 'danger'
}
