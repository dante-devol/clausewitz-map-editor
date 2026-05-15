import { useState } from 'react'
import {
  makeStyles,
  tokens,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  Tab,
  TabList,
  Text,
  Badge
} from '@fluentui/react-components'
import { useI18n } from '../i18n/I18nProvider'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { unpackColor } from '../../../../shared/mapDataTypes'
import { useProvinceValidationStore } from '../../infra/store/provinceValidationStore'

const useStyles = makeStyles({
  surface: {
    maxWidth: '860px',
    width: '90vw'
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    height: '70vh'
  },
  tableWrap: {
    overflowY: 'auto',
    flex: 1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
    fontFamily: 'monospace'
  },
  th: {
    position: 'sticky',
    top: 0,
    backgroundColor: tokens.colorNeutralBackground3,
    padding: '4px 8px',
    textAlign: 'left',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    fontWeight: 600,
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '3px 8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    whiteSpace: 'nowrap'
  },
  trEven: {
    backgroundColor: tokens.colorNeutralBackground1
  },
  trOdd: {
    backgroundColor: tokens.colorNeutralBackground2
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
  cap: {
    color: tokens.colorNeutralForeground3,
    fontSize: '11px'
  },
  statusText: {
    color: tokens.colorNeutralForeground2
  },
  message: {
    whiteSpace: 'normal'
  }
})

const ROW_CAP = 500
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
  const provinceCatalog = useMapDataStore((s) => s.provinceCatalog)
  const rows = provinceCatalog.slice(0, ROW_CAP)
  const total = provinceCatalog.length

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color="informative">{formatNumber(total)}</Badge>
        <Text size={200}>{t('debug.provincesLoaded', { count: formatNumber(total) })}</Text>
        {total > ROW_CAP && <Text className={styles.cap}>{t('debug.showingFirst', { count: formatNumber(ROW_CAP) })}</Text>}
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>{t('debug.column.id')}</th>
              <th className={styles.th}>{t('debug.column.color')}</th>
              <th className={styles.th}>{t('debug.column.type')}</th>
              <th className={styles.th}>{t('debug.column.coastal')}</th>
              <th className={styles.th}>{t('debug.column.terrain')}</th>
              <th className={styles.th}>{t('debug.column.continent')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const color = p.color ?? 0
              const { r, g, b } = unpackColor(color)
              return (
                <tr key={p.key} className={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                  <td className={styles.td}>{p.id ?? 'xxxxx'}</td>
                  <td className={styles.td}>
                    {p.color !== null && <Swatch color={p.color} />}
                    {p.color !== null ? `${r}, ${g}, ${b}` : '—'}
                  </td>
                  <td className={styles.td}>{p.type ?? '—'}</td>
                  <td className={styles.td}>{p.isCoastal ? '✓' : '—'}</td>
                  <td className={styles.td}>{p.terrain || '—'}</td>
                  <td className={styles.td}>{p.continent || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function TerrainsTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const terrains = useMapDataStore((s) => s.terrains)
  const rows = Array.from(terrains.values())

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color="informative">{formatNumber(rows.length)}</Badge>
        <Text size={200}>{t('debug.terrainCategoriesLoaded', { count: formatNumber(rows.length) })}</Text>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>{t('debug.column.codeName')}</th>
              <th className={styles.th}>{t('debug.column.color')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => {
              const { r, g, b } = unpackColor(t.color)
              return (
                <tr key={t.codeName} className={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                  <td className={styles.td}>{t.codeName}</td>
                  <td className={styles.td}>
                    <Swatch color={t.color} />
                    {r}, {g}, {b}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ContinentsTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const continents = useMapDataStore((s) => s.continents)
  const rows = Array.from(continents.values()).sort((a, b) => a.position - b.position)

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color="informative">{formatNumber(rows.length)}</Badge>
        <Text size={200}>{t('debug.continentsLoaded', { count: formatNumber(rows.length) })}</Text>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>{t('debug.column.position')}</th>
              <th className={styles.th}>{t('debug.column.codeName')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.codeName} className={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                <td className={styles.td}>{c.position}</td>
                <td className={styles.td}>{c.codeName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function StatesTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const states = useMapDataStore((s) => s.states)
  const status = useMapDataStore((s) => s.statesStatus)
  const rows = states.slice(0, ROW_CAP)

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color={statusToBadgeColor(status)}>{formatNumber(states.length)}</Badge>
        <Text size={200}>{t('debug.statesLoaded', { count: formatNumber(states.length) })}</Text>
        <Text size={200} className={styles.statusText}>
          {t('debug.datasetStatus', { status: t(`debug.datasetState.${status}`) })}
        </Text>
        {states.length > ROW_CAP && <Text className={styles.cap}>{t('debug.showingFirst', { count: formatNumber(ROW_CAP) })}</Text>}
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>{t('debug.column.id')}</th>
              <th className={styles.th}>{t('debug.column.name')}</th>
              <th className={styles.th}>{t('debug.column.stateCategory')}</th>
              <th className={styles.th}>{t('debug.column.manpower')}</th>
              <th className={styles.th}>{t('debug.column.owner')}</th>
              <th className={styles.th}>{t('debug.column.provinceCount')}</th>
              <th className={styles.th}>{t('debug.column.provinces')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((state, i) => (
              <tr key={state.id} className={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                <td className={styles.td}>{state.id}</td>
                <td className={styles.td}>{state.name || '—'}</td>
                <td className={styles.td}>{state.stateCategory || '—'}</td>
                <td className={styles.td}>{formatNumber(state.manpower)}</td>
                <td className={styles.td}>{state.history.owner ?? '—'}</td>
                <td className={styles.td}>{formatNumber(state.provinceIds.length)}</td>
                <td className={styles.td}>{formatProvincePreview(state.provinceIds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function StateCategoriesTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const stateCategories = useMapDataStore((s) => s.stateCategories)
  const rows = Array.from(stateCategories.values())

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color="informative">{formatNumber(rows.length)}</Badge>
        <Text size={200}>{t('debug.stateCategoriesLoaded', { count: formatNumber(rows.length) })}</Text>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>{t('debug.column.codeName')}</th>
              <th className={styles.th}>{t('debug.column.localBuildingSlots')}</th>
              <th className={styles.th}>{t('debug.column.color')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((cat, i) => {
              const { r, g, b } = unpackColor(cat.color)
              return (
                <tr key={cat.codeName} className={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                  <td className={styles.td}>{cat.codeName}</td>
                  <td className={styles.td}>{cat.localBuildingSlots}</td>
                  <td className={styles.td}>
                    <Swatch color={cat.color} />
                    {r}, {g}, {b}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function BuildingsTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const buildings = useMapDataStore((s) => s.buildings)
  const rows = Array.from(buildings.values())

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color="informative">{formatNumber(rows.length)}</Badge>
        <Text size={200}>{t('debug.buildingsLoaded', { count: formatNumber(rows.length) })}</Text>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>{t('debug.column.codeName')}</th>
              <th className={styles.th}>{t('debug.column.sharesSlots')}</th>
              <th className={styles.th}>{t('debug.column.provinceMax')}</th>
              <th className={styles.th}>{t('debug.column.stateMax')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => (
              <tr key={b.codeName} className={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                <td className={styles.td}>{b.codeName}</td>
                <td className={styles.td}>{b.levelCap.sharesSlots ? '✓' : '—'}</td>
                <td className={styles.td}>{b.levelCap.provinceMax ?? '—'}</td>
                <td className={styles.td}>{b.levelCap.stateMax ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function StrategicRegionsTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const strategicRegions = useMapDataStore((s) => s.strategicRegions)
  const status = useMapDataStore((s) => s.strategicRegionsStatus)
  const rows = strategicRegions.slice(0, ROW_CAP)

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color={statusToBadgeColor(status)}>{formatNumber(strategicRegions.length)}</Badge>
        <Text size={200}>{t('debug.strategicRegionsLoaded', { count: formatNumber(strategicRegions.length) })}</Text>
        <Text size={200} className={styles.statusText}>
          {t('debug.datasetStatus', { status: t(`debug.datasetState.${status}`) })}
        </Text>
        {strategicRegions.length > ROW_CAP && <Text className={styles.cap}>{t('debug.showingFirst', { count: formatNumber(ROW_CAP) })}</Text>}
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>{t('debug.column.id')}</th>
              <th className={styles.th}>{t('debug.column.name')}</th>
              <th className={styles.th}>{t('debug.column.weatherPeriods')}</th>
              <th className={styles.th}>{t('debug.column.provinceCount')}</th>
              <th className={styles.th}>{t('debug.column.provinces')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((region, i) => (
              <tr key={region.id} className={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                <td className={styles.td}>{region.id}</td>
                <td className={styles.td}>{region.name || '—'}</td>
                <td className={styles.td}>{formatNumber(region.weatherPeriods?.length ?? 0)}</td>
                <td className={styles.td}>{formatNumber(region.provinceIds.length)}</td>
                <td className={styles.td}>{formatProvincePreview(region.provinceIds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ValidationTab() {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const status = useProvinceValidationStore((s) => s.status)
  const phase = useProvinceValidationStore((s) => s.phase)
  const issues = useProvinceValidationStore((s) => s.issues)
  const summary = useProvinceValidationStore((s) => s.summary)
  const rows = issues.slice(0, ROW_CAP)

  return (
    <>
      <div className={styles.summary}>
        <Badge appearance="filled" color="danger">{formatNumber(summary.errorCount)}</Badge>
        <Badge appearance="filled" color="warning">{formatNumber(summary.warningCount)}</Badge>
        <Badge appearance="filled" color="informative">{formatNumber(summary.infoCount)}</Badge>
        <Text size={200}>{t('debug.validationIssues', { count: formatNumber(issues.length) })}</Text>
        <Text size={200} className={styles.statusText}>
          {t('debug.validationStatus', {
            status: t(`debug.validationState.${status}`),
            phase: phase ? t(`debug.validationPhase.${phase}`) : '—'
          })}
        </Text>
        {issues.length > ROW_CAP && <Text className={styles.cap}>{t('debug.showingFirst', { count: formatNumber(ROW_CAP) })}</Text>}
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>{t('debug.column.severity')}</th>
              <th className={styles.th}>{t('debug.column.id')}</th>
              <th className={styles.th}>{t('debug.column.codeName')}</th>
              <th className={styles.th}>{t('debug.column.message')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((issue, i) => (
              <tr key={`${issue.provinceKey}:${issue.code}:${i}`} className={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                <td className={styles.td}>{issue.severity}</td>
                <td className={styles.td}>{issue.provinceId ?? 'xxxxx'}</td>
                <td className={styles.td}>{issue.code}</td>
                <td className={`${styles.td} ${styles.message}`}>{issue.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

type TabId = 'provinces' | 'terrain' | 'continents' | 'states' | 'strategicRegions' | 'stateCategories' | 'buildings' | 'validation'

interface DebugPanelProps {
  open: boolean
  onClose: () => void
}

export function DebugPanel({ open, onClose }: DebugPanelProps) {
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
  const validationSummary = useProvinceValidationStore((s) => s.summary)

  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) onClose() }}>
      <DialogSurface className={styles.surface}>
        <DialogTitle>{t('debug.title')}</DialogTitle>
        <DialogBody className={styles.body}>
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
            <Tab value="validation">
              {t('debug.tab.validation')} <Badge appearance="tint">{formatNumber(validationSummary.errorCount + validationSummary.warningCount + validationSummary.infoCount)}</Badge>
            </Tab>
          </TabList>
          <DialogContent>
            {tab === 'provinces'       && <ProvincesTab />}
            {tab === 'terrain'         && <TerrainsTab />}
            {tab === 'continents'      && <ContinentsTab />}
            {tab === 'states'          && <StatesTab />}
            {tab === 'strategicRegions' && <StrategicRegionsTab />}
            {tab === 'stateCategories' && <StateCategoriesTab />}
            {tab === 'buildings'       && <BuildingsTab />}
            {tab === 'validation'      && <ValidationTab />}
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
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
