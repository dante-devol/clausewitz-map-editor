import { useEffect, useMemo } from 'react'
import { makeStyles, tokens, Text } from '@fluentui/react-components'
import { useProfilerStore } from '../../infra/store/profilerStore'
import { setProfilerEnabled } from '../../infra/lib/profiler'

const useStyles = makeStyles({
  panel: {
    position: 'fixed',
    bottom: tokens.spacingVerticalL,
    right: tokens.spacingHorizontalL,
    zIndex: 10000,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow16,
    padding: tokens.spacingVerticalM,
    minWidth: '280px',
    fontFamily: 'monospace',
    fontSize: '11px',
    // Lets clicks/drags on the map underneath pass straight through — this
    // is a read-only overlay, it shouldn't intercept pointer events.
    pointerEvents: 'none'
  },
  title: {
    fontWeight: 600,
    marginBottom: tokens.spacingVerticalXS
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    whiteSpace: 'nowrap'
  },
  label: {
    color: tokens.colorNeutralForeground2
  }
})

interface ProfilerOverlayProps {
  open: boolean
}

const RATE_WINDOW_MS = 1000

interface ProfilerRow {
  label: string
  callsPerSec: number
  last: number
  avg: number
  max: number
}

export function ProfilerOverlay({ open }: ProfilerOverlayProps) {
  const styles = useStyles()
  const samplesByLabel = useProfilerStore((s) => s.samplesByLabel)

  // Instrumentation is a no-op while the overlay is closed, so opening it is
  // the only thing that turns on the (small but nonzero) per-call cost of
  // recording samples.
  useEffect(() => {
    setProfilerEnabled(open)
    return () => setProfilerEnabled(false)
  }, [open])

  const rows = useMemo<ProfilerRow[]>(() => {
    const now = performance.now()
    return [...samplesByLabel.entries()].map(([label, samples]) => {
      const durations = samples.map((s) => s.duration)
      const last = durations[durations.length - 1] ?? 0
      const avg = durations.reduce((sum, d) => sum + d, 0) / (durations.length || 1)
      const max = Math.max(0, ...durations)
      const callsPerSec = samples.filter((s) => now - s.timestamp <= RATE_WINDOW_MS).length
      return { label, callsPerSec, last, avg, max }
    })
  }, [samplesByLabel])

  if (!open) return null

  return (
    <div className={styles.panel}>
      <div className={styles.title}>Profiler</div>
      {rows.length === 0 && (
        <Text size={200} className={styles.label}>No samples yet — interact with the map.</Text>
      )}
      {rows.map((row) => (
        <div key={row.label} className={styles.row}>
          <span className={styles.label}>{row.label}</span>
          <span>{row.callsPerSec}/s · {row.last.toFixed(1)}ms last · {row.avg.toFixed(1)}ms avg · {row.max.toFixed(1)}ms max</span>
        </div>
      ))}
    </div>
  )
}
