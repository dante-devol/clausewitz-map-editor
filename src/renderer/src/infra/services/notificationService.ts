import { useNotificationStore, type NotificationProgress, type NotificationRecord, type NotificationTone } from '../store/notificationStore'

interface ProgressInput {
  scope: string
  title: string
  message?: string | null
  progress: NotificationProgress
  tone?: NotificationTone
}

interface CompletionInput {
  scope: string
  title: string
  message?: string | null
  tone?: NotificationTone
  autoCloseAfterMs?: number | null
}

interface AckInput {
  id?: string
  scope?: string
  title: string
  message?: string | null
  tone?: NotificationTone
  autoCloseAfterMs?: number | null
}

const AUTO_DISMISS_TIMERS = new Map<string, ReturnType<typeof setTimeout>>()
const DEFAULT_ACK_TIMEOUT_MS = 2200

// Buffer advanceProgress calls and flush once per animation frame to avoid
// overwhelming React's update scheduler when IPC events arrive in rapid bursts.
const PENDING_ADVANCES = new Map<string, Omit<NotificationRecord, 'createdAt' | 'updatedAt'>>()
let advanceFlushId: ReturnType<typeof requestAnimationFrame> | null = null

function flushAdvances(): void {
  advanceFlushId = null
  for (const input of PENDING_ADVANCES.values()) upsertNotification(input)
  PENDING_ADVANCES.clear()
}

export const notificationService = {
  beginProgress({ scope, title, message = null, progress, tone = 'neutral' }: ProgressInput): void {
    upsertNotification({
      id: scope,
      scope,
      kind: 'progress',
      tone,
      title,
      message,
      progress,
      autoCloseAfterMs: null
    })
  },

  advanceProgress({ scope, title, message = null, progress, tone = 'neutral' }: ProgressInput): void {
    PENDING_ADVANCES.set(scope, { id: scope, scope, kind: 'progress', tone, title, message, progress, autoCloseAfterMs: null })
    advanceFlushId ??= requestAnimationFrame(flushAdvances)
  },

  completeProgress({
    scope,
    title,
    message = null,
    tone = 'success',
    autoCloseAfterMs = DEFAULT_ACK_TIMEOUT_MS
  }: CompletionInput): void {
    upsertNotification({
      id: scope,
      scope,
      kind: 'ack',
      tone,
      title,
      message,
      progress: null,
      autoCloseAfterMs
    })
  },

  failProgress({
    scope,
    title,
    message = null,
    tone = 'error',
    autoCloseAfterMs = null
  }: CompletionInput): void {
    upsertNotification({
      id: scope,
      scope,
      kind: 'ack',
      tone,
      title,
      message,
      progress: null,
      autoCloseAfterMs
    })
  },

  pushAck({
    id,
    scope,
    title,
    message = null,
    tone = 'success',
    autoCloseAfterMs = DEFAULT_ACK_TIMEOUT_MS
  }: AckInput): void {
    const resolvedId = id ?? scope ?? `ack:${crypto.randomUUID()}`
    upsertNotification({
      id: resolvedId,
      scope: scope ?? resolvedId,
      kind: 'ack',
      tone,
      title,
      message,
      progress: null,
      autoCloseAfterMs
    })
  },

  dismiss(id: string): void {
    clearTimer(id)
    useNotificationStore.getState().dismiss(id)
  },

  clear(): void {
    for (const id of AUTO_DISMISS_TIMERS.keys()) clearTimer(id)
    useNotificationStore.getState().clear()
  }
}

function upsertNotification(input: Omit<NotificationRecord, 'createdAt' | 'updatedAt'>): void {
  const now = Date.now()
  const existing = useNotificationStore.getState().notifications.find((notification) => notification.id === input.id)
  const record: NotificationRecord = {
    ...input,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  }

  clearTimer(record.id)
  useNotificationStore.getState().upsert(record)
  if (record.autoCloseAfterMs !== null) {
    const timer = setTimeout(() => {
      AUTO_DISMISS_TIMERS.delete(record.id)
      useNotificationStore.getState().beginDismiss(record.id)
    }, record.autoCloseAfterMs)
    AUTO_DISMISS_TIMERS.set(record.id, timer)
  }
}

function clearTimer(id: string): void {
  const timer = AUTO_DISMISS_TIMERS.get(id)
  if (!timer) return
  clearTimeout(timer)
  AUTO_DISMISS_TIMERS.delete(id)
}
