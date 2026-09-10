import { dialog, ipcMain } from 'electron'
import { channels } from '../../../shared/contract/events'
import type { ConfirmDialogOptions } from '../../../shared/contract/api'
import { getEventWindow } from '../context'

export function registerDialogHandlers(): void {
  ipcMain.handle(channels.dialogs.openFolder, async (event) => {
    const window = getEventWindow(event)
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      properties: ['openDirectory']
    })
    return canceled ? null : filePaths[0]
  })

  ipcMain.handle(channels.dialogs.confirm, async (event, options: ConfirmDialogOptions) => {
    const window = getEventWindow(event)
    const { response } = await dialog.showMessageBox(window, {
      type: 'warning',
      title: options.title,
      message: options.message,
      buttons: [options.confirmLabel, options.cancelLabel],
      defaultId: 1,
      cancelId: 1,
      noLink: true
    })
    return response === 0
  })
}

