import { dialog, ipcMain } from 'electron'
import { channels } from '../../../shared/contract/events'
import { getEventWindow } from '../context'

export function registerDialogHandlers(): void {
  ipcMain.handle(channels.dialogs.openFolder, async (event) => {
    const window = getEventWindow(event)
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      properties: ['openDirectory']
    })
    return canceled ? null : filePaths[0]
  })
}

