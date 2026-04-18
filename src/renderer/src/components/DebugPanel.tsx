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
import { useMapDataStore } from '../store/mapDataStore'
import { unpackColor } from '../../../shared/mapDataTypes'

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
  }
})

const ROW_CAP = 500

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
  const provinces = useMapDataStore((s) => s.provinces)
  const rows = Array.from(provinces.values()).slice(0, ROW_CAP)
  const total = provinces.size

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
              const { r, g, b } = unpackColor(p.color)
              return (
                <tr key={p.id} className={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                  <td className={styles.td}>{p.id}</td>
                  <td className={styles.td}>
                    <Swatch color={p.color} />
                    {r}, {g}, {b}
                  </td>
                  <td className={styles.td}>{p.type}</td>
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

type TabId = 'provinces' | 'terrains' | 'continents'

interface DebugPanelProps {
  open: boolean
  onClose: () => void
}

export function DebugPanel({ open, onClose }: DebugPanelProps) {
  const styles = useStyles()
  const { t, formatNumber } = useI18n()
  const [tab, setTab] = useState<TabId>('provinces')

  const provinces = useMapDataStore((s) => s.provinces)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)

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
              {t('debug.tab.provinces')} <Badge appearance="tint">{formatNumber(provinces.size)}</Badge>
            </Tab>
            <Tab value="terrains">
              {t('debug.tab.terrain')} <Badge appearance="tint">{formatNumber(terrains.size)}</Badge>
            </Tab>
            <Tab value="continents">
              {t('debug.tab.continents')} <Badge appearance="tint">{formatNumber(continents.size)}</Badge>
            </Tab>
          </TabList>
          <DialogContent>
            {tab === 'provinces'  && <ProvincesTab />}
            {tab === 'terrains'   && <TerrainsTab />}
            {tab === 'continents' && <ContinentsTab />}
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
