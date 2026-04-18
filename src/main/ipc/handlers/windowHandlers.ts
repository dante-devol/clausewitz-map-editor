import { ipcMain } from 'electron'
import { channels } from '../../../shared/contract/events'
import { enterEditor } from '../../window'

export function registerWindowHandlers(): void {
  ipcMain.handle(channels.window.enterEditor, () => enterEditor())
}

