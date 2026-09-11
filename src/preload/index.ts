import { contextBridge, ipcRenderer } from 'electron'
import type { ApiContract } from '../shared/contract/api'
import { channels } from '../shared/contract/events'

const api: ApiContract = {
  app: {
    getSystemLocale: () => ipcRenderer.invoke(channels.app.getSystemLocale)
  },
  dialogs: {
    openFolder: () => ipcRenderer.invoke(channels.dialogs.openFolder),
    confirm: (options) => ipcRenderer.invoke(channels.dialogs.confirm, options)
  },
  files: {
    load: (path) => ipcRenderer.invoke(channels.files.load, path),
    unload: (path) => ipcRenderer.invoke(channels.files.unload, path),
    onChanged: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, data: Parameters<typeof callback>[0]) => callback(data)
      ipcRenderer.on(channels.files.changed, listener)
      return () => ipcRenderer.off(channels.files.changed, listener)
    }
  },
  projects: {
    getRecent: () => ipcRenderer.invoke(channels.projects.getRecent),
    addRecent: (path) => ipcRenderer.invoke(channels.projects.addRecent, path),
    removeRecent: (path) => ipcRenderer.invoke(channels.projects.removeRecent, path),
    verifyModPath: (modPath) => ipcRenderer.invoke(channels.projects.verifyModPath, modPath),
    open: (request) => ipcRenderer.invoke(channels.projects.open, request),
    close: (projectId) => ipcRenderer.invoke(channels.projects.close, projectId)
  },
  game: {
    getPath: () => ipcRenderer.invoke(channels.game.getPath),
    setPath: (path) => ipcRenderer.invoke(channels.game.setPath, path),
    verifyPath: (gamePath) => ipcRenderer.invoke(channels.game.verifyPath, gamePath)
  },
  map: {
    load: (projectId) => ipcRenderer.invoke(channels.map.load, projectId),
    save: (projectId, provinces, continents, expectedHash) => ipcRenderer.invoke(channels.map.save, projectId, provinces, continents, expectedHash),
    saveStates: (projectId, requests) => ipcRenderer.invoke(channels.map.saveStates, projectId, requests),
    saveStrategicRegions: (projectId, requests) => ipcRenderer.invoke(channels.map.saveStrategicRegions, projectId, requests),
    loadStates: (projectId) => ipcRenderer.invoke(channels.map.loadStates, projectId),
    loadStrategicRegions: (projectId) => ipcRenderer.invoke(channels.map.loadStrategicRegions, projectId),
    loadWeatherEntries: (projectId) => ipcRenderer.invoke(channels.map.loadWeatherEntries, projectId),
    loadResources: (projectId) => ipcRenderer.invoke(channels.map.loadResources, projectId),
    onChanged: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, data: Parameters<typeof callback>[0]) => callback(data)
      ipcRenderer.on(channels.map.changed, listener)
      return () => ipcRenderer.off(channels.map.changed, listener)
    },
    saveBmp: (projectId, rgbaData, width, height) => ipcRenderer.invoke(channels.map.saveBmp, projectId, rgbaData, width, height)
  },
  settings: {
    get: () => ipcRenderer.invoke(channels.settings.get),
    getValue: (key) => ipcRenderer.invoke(channels.settings.getValue, key),
    set: (key, value) => ipcRenderer.invoke(channels.settings.set, key, value),
    reset: () => ipcRenderer.invoke(channels.settings.reset)
  },
  window: {
    enterEditor: () => ipcRenderer.invoke(channels.window.enterEditor),
    exitEditor: () => ipcRenderer.invoke(channels.window.exitEditor),
    confirmClose: () => ipcRenderer.invoke(channels.window.confirmClose),
    onBeforeClose: (callback) => {
      const listener = () => callback()
      ipcRenderer.on(channels.window.beforeClose, listener)
      return () => ipcRenderer.off(channels.window.beforeClose, listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
