import { ipcMain, dialog } from 'electron'
import { getMainWindow, enterEditor } from './window'
import { getRecentProjects, addRecentProject, removeRecentProject } from './recentProjects'
import { loadFile, watchFile, unwatchFile, getRecord } from './fileManager'
import { getConfig, getConfigValue, setConfigValue, resetConfig } from './config'
import type { Config } from './config'
import { getGamePath, setGamePath } from './gamePath'
import { verifyGamePaths, verifyModPaths } from './pathVerifier'
import { resolvePaths } from './pathResolver'
import { ContinentTxt } from './parsers/ContinentTxt'
import { DefinitionsCsv } from './parsers/DefinitionsCsv'
import { TerrainTxt } from './parsers/TerrainTxt'
import type { Continent } from '../shared/mapDataTypes'

export function registerIpcHandlers(): void {
  ipcMain.handle('projects:getRecent', () => getRecentProjects())
  ipcMain.handle('projects:addRecent', (_e, path: string) => addRecentProject(path))
  ipcMain.handle('projects:removeRecent', (_e, path: string) => removeRecentProject(path))

  // Opens a native folder-picker dialog and returns the chosen path, or null if cancelled.
  ipcMain.handle('dialog:openFolder', async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    return canceled ? null : filePaths[0]
  })

  ipcMain.handle('window:enterEditor', () => enterEditor())

  // Reads the file, records its hash, starts watching for external changes.
  // Returns { path, hash, content } where content is base64-encoded.
  ipcMain.handle('file:load', (_e, path: string) => {
    const mainWindow = getMainWindow()
    const record = loadFile(path)
    if (mainWindow) watchFile(path, mainWindow)
    return { path: record.path, hash: record.hash, content: record.content.toString('base64') }
  })

  // Returns the current on-disk content + hash without affecting watch state.
  // Use this to re-read after a file:changed event.
  ipcMain.handle('file:read', (_e, path: string) => {
    const record = loadFile(path)
    return { path: record.path, hash: record.hash, content: record.content.toString('base64') }
  })

  // Stops watching and clears the record for a file.
  ipcMain.handle('file:unload', (_e, path: string) => unwatchFile(path))

  // Returns the current in-memory hash for a path without hitting disk.
  ipcMain.handle('file:getHash', (_e, path: string) => getRecord(path)?.hash ?? null)

  ipcMain.handle('gamePath:get', () => getGamePath())
  ipcMain.handle('gamePath:set', (_e, path: string) => setGamePath(path))

  ipcMain.handle('paths:verifyGame', (_e, gamePath: string) => verifyGamePaths(gamePath))
  ipcMain.handle('paths:verifyMod', (_e, modPath: string) => verifyModPaths(modPath))
  ipcMain.handle('paths:resolve', (_e, gamePath: string, modPath: string) => resolvePaths(gamePath, modPath))

  ipcMain.handle('data:loadContinents', (_e, filePath: string) =>
    new ContinentTxt(filePath).load()
  )

  // Continents must be passed in so definition IDs can be resolved to names.
  ipcMain.handle('data:loadDefinitions', (_e, filePath: string, continents: Continent[]) =>
    new DefinitionsCsv(filePath).load(continents)
  )

  ipcMain.handle('data:loadTerrain', (_e, filePaths: string[]) =>
    new TerrainTxt(filePaths).load()
  )

  ipcMain.handle('config:get', () => getConfig())
  ipcMain.handle('config:getValue', (_e, key: keyof Config) => getConfigValue(key))
  ipcMain.handle('config:set', (_e, key: keyof Config, value: Config[typeof key]) => setConfigValue(key, value))
  ipcMain.handle('config:reset', () => resetConfig())
}
