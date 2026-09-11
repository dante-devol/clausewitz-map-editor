import { ipcMain } from 'electron'
import { channels } from '../../../shared/contract/events'
import { loadFile, watchFile, unwatchFile, getRecord } from '../../fileManager'
import { getEventWindow, type IpcContext } from '../context'

export function registerFileHandlers(context: IpcContext): void {
  ipcMain.handle(channels.files.load, (event, path: string) => {
    const window = getEventWindow(event)
    if (!context.sessions.isPathKnownForWindow(window, path)) {
      throw new Error(`Refusing to load a path outside the open project: ${path}`)
    }
    const record = loadFile(path)
    watchFile(path, window)
    return { path: record.path, hash: record.hash, content: record.content.toString('base64') }
  })

  ipcMain.handle(channels.files.read, (event, path: string) => {
    const window = getEventWindow(event)
    if (!context.sessions.isPathKnownForWindow(window, path)) {
      throw new Error(`Refusing to read a path outside the open project: ${path}`)
    }
    const record = loadFile(path)
    return { path: record.path, hash: record.hash, content: record.content.toString('base64') }
  })

  ipcMain.handle(channels.files.unload, (event, path: string) => {
    const window = getEventWindow(event)
    if (!context.sessions.isPathKnownForWindow(window, path)) return
    unwatchFile(path)
  })

  ipcMain.handle(channels.files.getHash, (event, path: string) => {
    const window = getEventWindow(event)
    if (!context.sessions.isPathKnownForWindow(window, path)) return null
    return getRecord(path)?.hash ?? null
  })
}
