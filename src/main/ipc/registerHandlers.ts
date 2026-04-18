import { createIpcContext } from './context'
import { registerDialogHandlers } from './handlers/dialogHandlers'
import { registerFileHandlers } from './handlers/fileHandlers'
import { registerGameHandlers } from './handlers/gameHandlers'
import { registerMapHandlers } from './handlers/mapHandlers'
import { registerProjectHandlers } from './handlers/projectHandlers'
import { registerSettingsHandlers } from './handlers/settingsHandlers'
import { registerWindowHandlers } from './handlers/windowHandlers'

export function registerIpcHandlers(): void {
  const context = createIpcContext()
  registerDialogHandlers()
  registerFileHandlers()
  registerGameHandlers()
  registerProjectHandlers(context)
  registerMapHandlers(context)
  registerSettingsHandlers()
  registerWindowHandlers()
}
