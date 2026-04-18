import { ipcMain } from 'electron'
import { channels } from '../../../shared/contract/events'
import { getEventWindow, type IpcContext } from '../context'

export function registerMapHandlers(context: IpcContext): void {
  ipcMain.handle(channels.map.load, (event, projectId: string) => {
    const window = getEventWindow(event)
    return context.sessions.loadForWindow(window, projectId)
  })
}
