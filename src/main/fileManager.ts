import { createHash } from 'crypto'
import { readFileSync, watch, FSWatcher } from 'fs'
import type { BrowserWindow } from 'electron'
import { channels } from '../shared/contract/events'

export interface FileRecord {
  path: string
  hash: string
  content: Buffer
}

interface WatchEntry {
  watcher: FSWatcher
  debounce: ReturnType<typeof setTimeout> | null
}

const records = new Map<string, FileRecord>()
const watchers = new Map<string, WatchEntry>()

export function computeHash(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}

export function loadFile(path: string): FileRecord {
  const content = readFileSync(path)
  const record = { path, hash: computeHash(content), content }
  records.set(path, record)
  return record
}

export function getRecord(path: string): FileRecord | undefined {
  return records.get(path)
}

// Starts watching a file for external changes.
// Fires file:changed on the window when the hash changes.
// onChanged is also called after the hash check confirms a real change — use it
// to trigger re-parsing or other side effects in the main process.
// Safe to call multiple times — subsequent calls for the same path are no-ops.
export function watchFile(path: string, window: BrowserWindow, onChanged?: () => void): void {
  if (watchers.has(path)) return

  const entry: WatchEntry = { watcher: null!, debounce: null }

  entry.watcher = watch(path, () => {
    // Debounce: some editors write via temp-rename, firing the event multiple times.
    if (entry.debounce) clearTimeout(entry.debounce)
    entry.debounce = setTimeout(() => {
      try {
        const content = readFileSync(path)
        const hash = computeHash(content)
        const existing = records.get(path)
        if (!existing || hash === existing.hash) return
        records.set(path, { path, hash, content })
        window.webContents.send(channels.files.changed, { path, hash })
        onChanged?.()
      } catch {
        // File may have been temporarily unavailable during a write — ignore.
      }
    }, 100)
  })

  watchers.set(path, entry)
}

export function unwatchFile(path: string): void {
  const entry = watchers.get(path)
  if (!entry) return
  if (entry.debounce) clearTimeout(entry.debounce)
  entry.watcher.close()
  watchers.delete(path)
  records.delete(path)
}
