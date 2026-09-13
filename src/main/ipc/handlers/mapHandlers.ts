import { ipcMain } from 'electron'
import { channels } from '../../../shared/contract/events'
import type { Continent, Province } from '../../../shared/mapDataTypes'
import type { StateSaveOperation, StrategicRegionSaveOperation } from '../../../shared/contract/api'
import { getEventWindow, type IpcContext } from '../context'

export function registerMapHandlers(context: IpcContext): void {
  ipcMain.handle(channels.map.load, (event, projectId: string) => {
    const window = getEventWindow(event)
    return context.sessions.loadForWindow(window, projectId)
  })

  ipcMain.handle(
    channels.map.save,
    (event, projectId: string, provinces: Province[], continents: Continent[], expectedHash: string) => {
      const window = getEventWindow(event)
      return context.sessions.saveDefinitionsForWindow(window, projectId, provinces, continents, expectedHash)
    }
  )

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

  ipcMain.handle(channels.map.saveStates, (event, projectId: string, operations: StateSaveOperation[]) => {
    const window = getEventWindow(event)
    context.sessions.saveStatesForWindow(window, projectId, operations)
  })

  ipcMain.handle(channels.map.saveStrategicRegions, (event, projectId: string, operations: StrategicRegionSaveOperation[]) => {
    const window = getEventWindow(event)
    context.sessions.saveStrategicRegionsForWindow(window, projectId, operations)
  })

  ipcMain.handle(channels.map.loadWeatherEntries, (event, projectId: string) => {
    const window = getEventWindow(event)
    return context.sessions.loadWeatherEntriesForWindow(window, projectId)
  })

  ipcMain.handle(channels.map.loadAdjacencies, (event, projectId: string) => {
    const window = getEventWindow(event)
    return context.sessions.loadAdjacenciesForWindow(window, projectId)
  })

  ipcMain.handle(channels.map.loadSupplyNodes, (event, projectId: string) => {
    const window = getEventWindow(event)
    return context.sessions.loadSupplyNodesForWindow(window, projectId)
  })

  ipcMain.handle(channels.map.loadRailways, (event, projectId: string) => {
    const window = getEventWindow(event)
    return context.sessions.loadRailwaysForWindow(window, projectId)
  })

  ipcMain.handle(channels.map.saveBmp, (event, projectId: string, rgbaData: Uint8Array, width: number, height: number) => {
    const window = getEventWindow(event)
    context.sessions.saveBmpForWindow(window, projectId, rgbaData, width, height)
  })
}
