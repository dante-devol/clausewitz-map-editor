import { ipcMain } from 'electron'
import { channels } from '../../../shared/contract/events'
import { getGamePath, setGamePath } from '../../gamePath'
import { verifyGamePaths } from '../../pathVerifier'

export function registerGameHandlers(): void {
  ipcMain.handle(channels.game.getPath, () => getGamePath())
  ipcMain.handle(channels.game.setPath, (_event, path: string) => setGamePath(path))
  ipcMain.handle(channels.game.verifyPath, (_event, path: string) => verifyGamePaths(path))
}

