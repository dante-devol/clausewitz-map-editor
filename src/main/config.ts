import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

// Add new config keys here. Defaults are the source of truth —
// only deviations from these are written to disk.
export interface Config {
  paths: {
    defaultMap: string       // /map/default.map
    definitions: string      // /map/definitions.csv
    provinces: string        // /map/provinces.bmp
    continent: string        // /map/continent.txt
    provinceTerrain: string  // /common/terrain
  }
}

export const DEFAULT_CONFIG: Config = {
  paths: {
    defaultMap: '/map/default.map',
    definitions: '/map/definition.csv',
    provinces: '/map/provinces.bmp',
    continent: '/map/continent.txt',
    provinceTerrain: '/common/terrain'
  }
}

const CONFIG_PATH = () => join(app.getPath('userData'), 'config.json')

function readOverrides(): Partial<Config> {
  try {
    const file = CONFIG_PATH()
    if (!existsSync(file)) return {}
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return {}
  }
}

function writeOverrides(overrides: Partial<Config>): void {
  writeFileSync(CONFIG_PATH(), JSON.stringify(overrides, null, 2), 'utf-8')
}

export function getConfig(): Config {
  return { ...DEFAULT_CONFIG, ...readOverrides() }
}

export function getConfigValue<K extends keyof Config>(key: K): Config[K] {
  return getConfig()[key]
}

export function setConfigValue<K extends keyof Config>(key: K, value: Config[K]): void {
  const overrides = readOverrides()
  if (value === DEFAULT_CONFIG[key]) {
    // If reverting to default, don't store it.
    delete overrides[key]
  } else {
    overrides[key] = value
  }
  writeOverrides(overrides)
}

export function resetConfig(): void {
  writeOverrides({})
}
