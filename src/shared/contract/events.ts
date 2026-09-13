export const channels = {
  app: {
    getSystemLocale: 'app:getSystemLocale',
    openUserDataFolder: 'app:openUserDataFolder'
  },
  projects: {
    getRecent: 'projects:getRecent',
    addRecent: 'projects:addRecent',
    removeRecent: 'projects:removeRecent',
    open: 'projects:open',
    close: 'projects:close',
    verifyModPath: 'projects:verifyModPath'
  },
  dialogs: {
    openFolder: 'dialogs:openFolder',
    confirm: 'dialogs:confirm'
  },
  files: {
    load: 'files:load',
    unload: 'files:unload',
    changed: 'files:changed'
  },
  game: {
    getPath: 'game:getPath',
    setPath: 'game:setPath',
    verifyPath: 'game:verifyPath'
  },
  map: {
    load: 'map:load',
    save: 'map:save',
    saveStates: 'map:saveStates',
    loadStates: 'map:loadStates',
    loadStrategicRegions: 'map:loadStrategicRegions',
    saveStrategicRegions: 'map:saveStrategicRegions',
    loadWeatherEntries: 'map:loadWeatherEntries',
    loadResources: 'map:loadResources',
    changed: 'map:changed',
    saveBmp: 'map:saveBmp'
  },
  settings: {
    get: 'settings:get',
    getValue: 'settings:getValue',
    set: 'settings:set',
    reset: 'settings:reset'
  },
  window: {
    enterEditor: 'window:enterEditor',
    exitEditor: 'window:exitEditor',
    beforeClose: 'window:beforeClose',
    confirmClose: 'window:confirmClose'
  }
} as const
