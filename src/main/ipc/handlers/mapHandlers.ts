import { ipcMain } from 'electron'
import { channels } from '../../../shared/contract/events'
import { DefinitionsCsv } from '../../parsers/DefinitionsCsv'
import type { Continent, Province, StateDefinition } from '../../../shared/mapDataTypes'
import { getEventWindow, type IpcContext } from '../context'

export function registerMapHandlers(context: IpcContext): void {
  ipcMain.handle(channels.map.load, (event, projectId: string) => {
    const window = getEventWindow(event)
    return context.sessions.loadForWindow(window, projectId)
  })

  ipcMain.handle(channels.map.save, (event, projectId: string, provinces: Province[], continents: Continent[]) => {
    const window = getEventWindow(event)
    const project = context.sessions.projectForWindow(window, projectId)
    new DefinitionsCsv(project.resolvedPaths.definitions).save(provinces, continents)
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

  ipcMain.handle(channels.map.saveStates, (event, projectId: string, states: StateDefinition[]) => {
    const window = getEventWindow(event)
    context.sessions.saveStatesForWindow(window, projectId, states)
  })
}
