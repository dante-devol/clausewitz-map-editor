import { ipcMain } from 'electron'
import { channels } from '../../../shared/contract/events'
import { addRecentProject, getRecentProjects, removeRecentProject } from '../../recentProjects'
import { verifyModPaths } from '../../pathVerifier'
import { getEventWindow, type IpcContext } from '../context'

export function registerProjectHandlers(context: IpcContext): void {
  ipcMain.handle(channels.projects.getRecent, () => getRecentProjects())
  ipcMain.handle(channels.projects.addRecent, (_event, path: string) => addRecentProject(path))
  ipcMain.handle(channels.projects.removeRecent, (_event, path: string) => removeRecentProject(path))
  ipcMain.handle(channels.projects.verifyModPath, (_event, modPath: string) => verifyModPaths(modPath))

  ipcMain.handle(channels.projects.open, (event, request) => {
    const window = getEventWindow(event)
    return context.sessions.openForWindow(window, request)
  })
}
