import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { ProjectSessionRegistry } from '../services/projects/ProjectSessionRegistry'

export interface IpcContext {
  sessions: ProjectSessionRegistry
}

export function getEventWindow(event: IpcMainInvokeEvent): BrowserWindow {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window) throw new Error('No BrowserWindow for IPC event')
  return window
}

export function createIpcContext(): IpcContext {
  return {
    sessions: new ProjectSessionRegistry()
  }
}

export function clearChannel(channel: string): void {
  ipcMain.removeHandler(channel)
}

