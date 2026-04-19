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
  upsert: (record: NotificationRecord) => void
  dismiss: (id: string) => void
  clear: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  upsert: (record) => set((state) => {
    const existingIndex = state.notifications.findIndex((notification) => notification.id === record.id)
    if (existingIndex === -1) {
      return {
        notifications: [...state.notifications, record].sort(compareNotifications)
      }
    }

    const notifications = [...state.notifications]
    notifications[existingIndex] = record
    notifications.sort(compareNotifications)
    return { notifications }
  }),

  dismiss: (id) => set((state) => ({
    notifications: state.notifications.filter((notification) => notification.id !== id)
  })),

  clear: () => set({ notifications: [] })
}))

function compareNotifications(a: NotificationRecord, b: NotificationRecord): number {
  return a.createdAt - b.createdAt || a.updatedAt - b.updatedAt || a.id.localeCompare(b.id)
}
