import { useEffect } from 'react'
import { useFileStore, type TrackedFile } from '../store/fileStore'

export interface TrackedFileState {
  file: TrackedFile | null
  // True when the file on disk has changed since we last loaded/reloaded it.
  externallyModified: boolean
  reload: () => Promise<void>
  unload: () => Promise<void>
}

export function useTrackedFile(path: string | null): TrackedFileState {
  const files = useFileStore((s) => s.files)
  const addFile = useFileStore((s) => s.addFile)
  const updateDiskHash = useFileStore((s) => s.updateDiskHash)
  const updateFile = useFileStore((s) => s.updateFile)
  const removeFile = useFileStore((s) => s.removeFile)

  const file = path ? (files.get(path) ?? null) : null

  useEffect(() => {
    if (!path) return

    window.api.files.load(path).then((result) => {
      addFile({ path: result.path, content: result.content, loadedHash: result.hash, diskHash: result.hash })
    })

    const cleanup = window.api.files.onChanged((event) => {
      if (event.path === path) updateDiskHash(event.path, event.hash)
    })

    return () => {
      cleanup()
      window.api.files.unload(path)
      removeFile(path)
    }
  }, [path])

  async function reload() {
    if (!path) return
    const result = await window.api.files.read(path)
    updateFile({ path: result.path, content: result.content, loadedHash: result.hash, diskHash: result.hash })
  }

  async function unload() {
    if (!path) return
    await window.api.files.unload(path)
    removeFile(path)
  }

  return {
    file,
    externallyModified: !!file && file.diskHash !== file.loadedHash,
    reload,
    unload
  }
}
