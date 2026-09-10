import { ipcMain } from 'electron'
import { channels } from '../../../shared/contract/events'
import type { Continent, Province } from '../../../shared/mapDataTypes'
import type { StateSaveRequest, StrategicRegionSaveRequest } from '../../../shared/contract/api'
import { getEventWindow, type IpcContext } from '../context'

export function registerMapHandlers(context: IpcContext): void {
  ipcMain.handle(channels.map.load, (event, projectId: string) => {
    const window = getEventWindow(event)
    return context.sessions.loadForWindow(window, projectId)
  })

  ipcMain.handle(channels.map.save, (event, projectId: string, provinces: Province[], continents: Continent[]) => {
    const window = getEventWindow(event)
    context.sessions.saveDefinitionsForWindow(window, projectId, provinces, continents)
  })

  ipcMain.handle(channels.map.loadStates, (event, projectId: string) => {
    const window = getEventWindow(event)
    return context.sessions.loadStatesForWindow(window, projectId)
  })

  ipcMain.handle(channels.map.loadStrategicRegions, (event, projectId: string) => {
    const window = getEventWindow(event)
    return context.sessions.loadStrategicRegionsForWindow(window, projectId)
  })

  ipcMain.handle(channels.map.loadResources, (event, projectId: string) => {
    const window = getEventWindow(event)
    return context.sessions.loadResourcesForWindow(window, projectId)
  })

  ipcMain.handle(channels.map.saveStates, (event, projectId: string, requests: StateSaveRequest[]) => {
    const window = getEventWindow(event)
    context.sessions.saveStatesForWindow(window, projectId, requests)
  })

  ipcMain.handle(channels.map.saveStrategicRegions, (event, projectId: string, requests: StrategicRegionSaveRequest[]) => {
    const window = getEventWindow(event)
    context.sessions.saveStrategicRegionsForWindow(window, projectId, requests)
  })

  ipcMain.handle(channels.map.loadWeatherEntries, (event, projectId: string) => {
    const window = getEventWindow(event)
    return context.sessions.loadWeatherEntriesForWindow(window, projectId)
  })

  ipcMain.handle(channels.map.saveBmp, (event, projectId: string, rgbaData: number[], width: number, height: number) => {
    const window = getEventWindow(event)
    context.sessions.saveBmpForWindow(window, projectId, rgbaData, width, height)
  })
}
