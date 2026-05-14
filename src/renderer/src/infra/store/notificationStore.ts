import { create } from 'zustand'

export type NotificationTone = 'neutral' | 'success' | 'warning' | 'error'
export type NotificationKind = 'progress' | 'ack'

export interface NotificationProgress {
  current: number
  total: number
}

export interface NotificationRecord {
  id: string
  scope: string
  kind: NotificationKind
  tone: NotificationTone
  title: string
  message: string | null
  progress: NotificationProgress | null
  createdAt: number
  updatedAt: number
  autoCloseAfterMs: number | null
}

interface NotificationState {
  notifications: NotificationRecord[]
  dismissingIds: ReadonlySet<string>
  upsert: (record: NotificationRecord) => void
  beginDismiss: (id: string) => void
  dismiss: (id: string) => void
  clear: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  dismissingIds: new Set(),

  upsert: (record) => set((state) => {
    const existingIndex = state.notifications.findIndex((notification) => notification.id === record.id)
    if (existingIndex === -1) {
      return {
        notifications: [...state.notifications, record].sort(compareNotifications),
        dismissingIds: state.dismissingIds.has(record.id)
          ? new Set([...state.dismissingIds].filter((id) => id !== record.id))
          : state.dismissingIds
      }
    }

    const notifications = [...state.notifications]
    notifications[existingIndex] = record
    notifications.sort(compareNotifications)
    return { notifications }
  }),

  beginDismiss: (id) => set((state) => ({
    dismissingIds: new Set([...state.dismissingIds, id])
  })),

  dismiss: (id) => set((state) => ({
    notifications: state.notifications.filter((notification) => notification.id !== id),
    dismissingIds: new Set([...state.dismissingIds].filter((dismissingId) => dismissingId !== id))
  })),

  clear: () => set({ notifications: [], dismissingIds: new Set() })
}))

function compareNotifications(a: NotificationRecord, b: NotificationRecord): number {
  return a.createdAt - b.createdAt || a.updatedAt - b.updatedAt || a.id.localeCompare(b.id)
}
