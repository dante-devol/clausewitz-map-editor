export const channels = {
  app: {
    getSystemLocale: 'app:getSystemLocale'
  },
  projects: {
    getRecent: 'projects:getRecent',
    addRecent: 'projects:addRecent',
    removeRecent: 'projects:removeRecent',
    open: 'projects:open',
    verifyModPath: 'projects:verifyModPath'
  },
  dialogs: {
    openFolder: 'dialogs:openFolder'
  },
  files: {
    load: 'files:load',
    read: 'files:read',
    unload: 'files:unload',
    getHash: 'files:getHash',
    changed: 'files:changed'
  },
  game: {
    getPath: 'game:getPath',
    setPath: 'game:setPath',
    verifyPath: 'game:verifyPath'
  },
  map: {
    load: 'map:load',
    loadStates: 'map:loadStates',
    loadStrategicRegions: 'map:loadStrategicRegions',
    changed: 'map:changed'
  },
  settings: {
    get: 'settings:get',
    getValue: 'settings:getValue',
    set: 'settings:set',
    reset: 'settings:reset'
  },
  window: {
    enterEditor: 'window:enterEditor'
  }
} as const
