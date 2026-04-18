import { ipcMain, dialog } from 'electron'
import { getMainWindow, enterEditor } from './window'
import { getRecentProjects, addRecentProject, removeRecentProject } from './recentProjects'

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
}
