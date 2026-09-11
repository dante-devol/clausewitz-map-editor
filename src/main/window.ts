import { BrowserWindow, shell, Menu } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { channels } from '../shared/contract/events'

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
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // The preload only uses contextBridge/ipcRenderer, both fully
      // supported in a sandboxed preload — no reason to disable it.
      sandbox: true
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

  // Give the renderer a chance to ask about unsaved changes before the window
  // actually closes. It responds via confirmClose(), which uses destroy() —
  // that bypasses this handler entirely, so there's no need to track "already
  // confirmed" state here.
  mainWindow.on('close', (event) => {
    event.preventDefault()
    mainWindow?.webContents.send(channels.window.beforeClose)
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

// Transitions the window back to project-selection size.
export function exitEditor(): void {
  if (!mainWindow) return
  mainWindow.unmaximize()
  mainWindow.setSize(480, 600)
  mainWindow.setResizable(false)
}

// Actually closes the window, once the renderer has decided it's OK to (see
// the 'close' handler above). destroy() skips the 'close' event (and with it
// beforeunload/unload), so this can't loop back into that handler.
export function confirmClose(): void {
  mainWindow?.destroy()
}
