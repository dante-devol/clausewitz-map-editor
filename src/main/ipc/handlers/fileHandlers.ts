import { ipcMain } from 'electron'
import { channels } from '../../../shared/contract/events'
import { loadFile, watchFile, unwatchFile, getRecord } from '../../fileManager'
import { getEventWindow } from '../context'

export function registerFileHandlers(): void {
  ipcMain.handle(channels.files.load, (event, path: string) => {
    const window = getEventWindow(event)
    const record = loadFile(path)
    watchFile(path, window)
    return { path: record.path, hash: record.hash, content: record.content.toString('base64') }
  })

  ipcMain.handle(channels.files.read, (_event, path: string) => {
    const record = loadFile(path)
    return { path: record.path, hash: record.hash, content: record.content.toString('base64') }
  })

  ipcMain.handle(channels.files.unload, (_event, path: string) => unwatchFile(path))
  ipcMain.handle(channels.files.getHash, (_event, path: string) => getRecord(path)?.hash ?? null)
}

