import { ipcMain } from 'electron'
import { channels } from '../../../shared/contract/events'
import { getConfig, getConfigValue, setConfigValue, resetConfig } from '../../config'
import type { Config } from '../../config'

export function registerSettingsHandlers(): void {
  ipcMain.handle(channels.settings.get, () => getConfig())
  ipcMain.handle(channels.settings.getValue, (_event, key: keyof Config) => getConfigValue(key))
  ipcMain.handle(channels.settings.set, (_event, key: keyof Config, value: Config[typeof key]) => setConfigValue(key, value))
  ipcMain.handle(channels.settings.reset, () => resetConfig())
}

