import { BrowserWindow, shell, Menu } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

// Starts at project-selection dimensions (480×600, non-resizable).
// window:enterEditor expands it to editor dimensions once a project is chosen.
export function createWindow(): void {
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

  // Remove the native menu bar entirely (autoHideMenuBar only hides it by default).
  Menu.setApplicationMenu(null)

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    // Open DevTools detached so they don't resize the app window.
    if (is.dev) mainWindow!.webContents.openDevTools({ mode: 'detach' })
  })

  // Any window.open() or target="_blank" link opens in the system browser instead.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // In dev, load from the Vite dev server (HMR). In production, load the built file.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Transitions the window from project-selection size to full editor size.
export function enterEditor(): void {
  if (!mainWindow) return
  mainWindow.setResizable(true)
  mainWindow.setSize(1280, 800, true)
  mainWindow.center()
}
