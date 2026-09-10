import { ipcMain } from 'electron'
import { channels } from '../../../shared/contract/events'
import { confirmClose, enterEditor, exitEditor } from '../../window'

export function registerWindowHandlers(): void {
  ipcMain.handle(channels.window.enterEditor, () => enterEditor())
  ipcMain.handle(channels.window.exitEditor, () => exitEditor())
  ipcMain.handle(channels.window.confirmClose, () => confirmClose())
}

