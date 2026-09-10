import { app, BrowserWindow } from 'electron'
import { createWindow } from './window'
import { registerIpcHandlers } from './ipc/registerHandlers'

registerIpcHandlers()

app.whenReady().then(() => {
  createWindow()
  // macOS: re-create the window when the dock icon is clicked with no windows
  // open. Clicking the dock icon while a window already exists (e.g. it was
  // just minimized) also fires 'activate' — that shouldn't spawn a second one.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
