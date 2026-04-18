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

// Per-session state needed to re-parse dependent data when files change.
const session = {
  continents: [] as Continent[],
  definitionPath: '',
  terrainPaths: [] as string[]
}

function pushReload(type: string, data: unknown): void {
  getMainWindow()?.webContents.send('data:reloaded', { type, data })
}

function reloadContinents(filePath: string): Continent[] {
  const continents = new ContinentTxt(filePath).load()
  session.continents = continents
  pushReload('continents', continents)
  return continents
}

function reloadDefinitions(): void {
  const provinces = new DefinitionsCsv(session.definitionPath).load(session.continents)
  pushReload('definitions', provinces)
}

function reloadTerrain(): void {
  const terrains = new TerrainTxt(session.terrainPaths).load()
  pushReload('terrain', terrains)
}

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

  ipcMain.handle('data:loadContinents', (_e, filePath: string) => {
    const mainWindow = getMainWindow()
    const continents = reloadContinents(filePath)
    loadFile(filePath)
    if (mainWindow) {
      watchFile(filePath, mainWindow, () => {
        // When continents change, cascade into definitions since they depend on continent IDs.
        reloadContinents(filePath)
        if (session.definitionPath) reloadDefinitions()
      })
    }
    return continents
  })

  ipcMain.handle('data:loadDefinitions', (_e, filePath: string, continents: Continent[]) => {
    const mainWindow = getMainWindow()
    session.definitionPath = filePath
    session.continents = continents
    const provinces = new DefinitionsCsv(filePath).load(continents)
    loadFile(filePath)
    if (mainWindow) watchFile(filePath, mainWindow, () => reloadDefinitions())
    return provinces
  })

  ipcMain.handle('data:loadTerrain', (_e, filePaths: string[]) => {
    const mainWindow = getMainWindow()
    session.terrainPaths = filePaths
    const terrains = new TerrainTxt(filePaths).load()
    for (const filePath of filePaths) {
      loadFile(filePath)
      if (mainWindow) watchFile(filePath, mainWindow, () => reloadTerrain())
    }
    return terrains
  })

  ipcMain.handle('config:get', () => getConfig())
  ipcMain.handle('config:getValue', (_e, key: keyof Config) => getConfigValue(key))
  ipcMain.handle('config:set', (_e, key: keyof Config, value: Config[typeof key]) => setConfigValue(key, value))
  ipcMain.handle('config:reset', () => resetConfig())
}
