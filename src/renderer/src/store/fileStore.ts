import { create } from 'zustand'

export interface TrackedFile {
  path: string
  content: string      // base64, as received from main
  loadedHash: string   // hash of content when we last loaded/reloaded
  diskHash: string     // last hash reported by the watcher
}

interface FileStoreState {
  files: Map<string, TrackedFile>
  addFile: (file: TrackedFile) => void
  updateDiskHash: (path: string, hash: string) => void
  updateFile: (file: TrackedFile) => void
  removeFile: (path: string) => void
}

export const useFileStore = create<FileStoreState>((set) => ({
  files: new Map(),

  addFile: (file) =>
    set((s) => { s.files.set(file.path, file); return { files: new Map(s.files) } }),

  // Called when file:changed fires — updates diskHash so consumers can detect drift.
  updateDiskHash: (path, hash) =>
    set((s) => {
      const existing = s.files.get(path)
      if (!existing) return s
      s.files.set(path, { ...existing, diskHash: hash })
      return { files: new Map(s.files) }
    }),

  // Called after a reload — resets both hashes to the freshly-read state.
  updateFile: (file) =>
    set((s) => { s.files.set(file.path, file); return { files: new Map(s.files) } }),

  removeFile: (path) =>
    set((s) => { s.files.delete(path); return { files: new Map(s.files) } })
}))
