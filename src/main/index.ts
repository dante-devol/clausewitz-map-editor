import { app, BrowserWindow, shell, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { is } from '@electron-toolkit/utils'

const RECENT_PROJECTS_PATH = () => join(app.getPath('userData'), 'recent-projects.json')
const MAX_RECENT = 10

function getRecentProjects(): string[] {
  try {
    const file = RECENT_PROJECTS_PATH()
    if (!existsSync(file)) return []
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return []
  }
}

function saveRecentProjects(projects: string[]): void {
  writeFileSync(RECENT_PROJECTS_PATH(), JSON.stringify(projects), 'utf-8')
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 600,
    resizable: false,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  Menu.setApplicationMenu(null)

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    if (is.dev) mainWindow!.webContents.openDevTools({ mode: 'detach' })
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('projects:getRecent', () => getRecentProjects())

ipcMain.handle('projects:addRecent', (_e, path: string) => {
  const updated = [path, ...getRecentProjects().filter((p) => p !== path)].slice(0, MAX_RECENT)
  saveRecentProjects(updated)
})

ipcMain.handle('projects:removeRecent', (_e, path: string) => {
  saveRecentProjects(getRecentProjects().filter((p) => p !== path))
})

ipcMain.handle('dialog:openFolder', async () => {
  if (!mainWindow) return null
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  return canceled ? null : filePaths[0]
})

ipcMain.handle('window:enterEditor', () => {
  if (!mainWindow) return
  mainWindow.setResizable(true)
  mainWindow.setSize(1280, 800, true)
  mainWindow.center()
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
