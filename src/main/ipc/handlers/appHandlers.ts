import { app, ipcMain, shell } from 'electron'
import { channels } from '../../../shared/contract/events'
import { normalizeAppLocale } from '../../../shared/i18n'

export function registerAppHandlers(): void {
  ipcMain.handle(channels.app.getSystemLocale, () => normalizeAppLocale(app.getLocale()))
  ipcMain.handle(channels.app.openUserDataFolder, () => shell.openPath(app.getPath('userData')))
}
