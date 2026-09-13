import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { AppConfig } from '../shared/contract/api'
import { deepEqual } from '../shared/deepEqual'
import { log } from './logger'

// Add new config keys here. Defaults are the source of truth —
// only deviations from these are written to disk.
export type Config = AppConfig

export const DEFAULT_CONFIG: Config = {
  locale: null,
  paths: {
    descriptor: '/descriptor.mod',
    defaultMap: '/map/default.map',
    definitions: '/map/definition.csv',
    provinces: '/map/provinces.bmp',
    continent: '/map/continent.txt',
    provinceTerrain: '/common/terrain',
    states: '/history/states',
    strategicRegions: '/map/strategicregions',
    rivers: '/map/rivers.bmp',
    stateCategories: '/common/state_category',
    resources: '/common/resources',
    buildings: '/common/buildings',
    weather: '/common/weather.txt',
    localisation: '/localisation/english'
  },
  displayModeOverrides: {}
}

const CONFIG_PATH = () => join(app.getPath('userData'), 'config.json')

function readOverrides(): Partial<Config> {
  try {
    const file = CONFIG_PATH()
    if (!existsSync(file)) return {}
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch (error) {
    // Previously silent: a corrupt config.json would just revert to defaults
    // with no trace of why.
    log.warn('Failed to read config.json, falling back to defaults', { error: String(error) })
    return {}
  }
}

function writeOverrides(overrides: Partial<Config>): void {
  writeFileSync(CONFIG_PATH(), JSON.stringify(overrides, null, 2), 'utf-8')
}

export function getConfig(): Config {
  const overrides = readOverrides()
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    // `paths` is the one config value with independent leaf keys — a
    // hand-edited (or otherwise partial) override for just one of them must
    // not blank out the rest. The other config values are always written
    // whole, so a plain override on top of the defaults is enough for them.
    paths: { ...DEFAULT_CONFIG.paths, ...overrides.paths }
  }
}

export function getConfigValue<K extends keyof Config>(key: K): Config[K] {
  return getConfig()[key]
}

export function setConfigValue<K extends keyof Config>(key: K, value: Config[K]): void {
  const overrides = readOverrides()
  if (deepEqual(value, DEFAULT_CONFIG[key])) {
    // If reverting to default, don't store it. Config values are objects
    // (paths, displayModeOverrides) or primitives (locale), so a structural
    // comparison is needed — `===` never matches for a freshly built object.
    delete overrides[key]
  } else {
    overrides[key] = value
  }
  writeOverrides(overrides)
}

export function resetConfig(): void {
  writeOverrides({})
}
