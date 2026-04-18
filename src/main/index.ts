import { app } from 'electron'
import { createWindow } from './window'
import { registerIpcHandlers } from './ipc'

registerIpcHandlers()

app.whenReady().then(() => {
  createWindow()
  // macOS: re-create the window when the dock icon is clicked with no windows open.
  app.on('activate', () => {
    createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
