import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const userDataDir = mkdtempSync(join(tmpdir(), 'hoi4-config-test-'))

vi.mock('electron', () => ({
  app: { getPath: () => userDataDir }
}))

// Imported after the mock so config.ts's `import { app } from 'electron'` picks it up.
const { DEFAULT_CONFIG, getConfig, setConfigValue, resetConfig } = await import('../config')

function configFile(): string {
  return join(userDataDir, 'config.json')
}

beforeEach(() => {
  resetConfig()
})

afterEach(() => {
  rmSync(configFile(), { force: true })
})

describe('getConfig', () => {
  it('deep-merges a partial paths override with the defaults instead of replacing the whole object', () => {
    setConfigValue('paths', { ...DEFAULT_CONFIG.paths, definitions: '/custom/definition.csv' })
    // Simulate a hand-edited config.json that only overrides one path key.
    const raw = JSON.parse(readFileSync(configFile(), 'utf-8'))
    raw.paths = { definitions: '/hand-edited/definition.csv' }
    writeFileSync(configFile(), JSON.stringify(raw))

    const config = getConfig()
    expect(config.paths.definitions).toBe('/hand-edited/definition.csv')
    // Every other path key must still fall back to its default, not become undefined.
    expect(config.paths.provinces).toBe(DEFAULT_CONFIG.paths.provinces)
    expect(config.paths.states).toBe(DEFAULT_CONFIG.paths.states)
  })
})

describe('setConfigValue', () => {
  it('does not persist a value that is structurally equal to the default', () => {
    setConfigValue('paths', { ...DEFAULT_CONFIG.paths })
    const raw = JSON.parse(readFileSync(configFile(), 'utf-8'))
    expect(raw.paths).toBeUndefined()
  })

  it('persists a value that actually differs from the default', () => {
    setConfigValue('paths', { ...DEFAULT_CONFIG.paths, provinces: '/custom/provinces.bmp' })
    const raw = JSON.parse(readFileSync(configFile(), 'utf-8'))
    expect(raw.paths.provinces).toBe('/custom/provinces.bmp')
  })

  it('reverting an object value to the default removes the override', () => {
    setConfigValue('displayModeOverrides', { type: { land: '#123456' } })
    setConfigValue('displayModeOverrides', {})
    const raw = JSON.parse(readFileSync(configFile(), 'utf-8'))
    expect(raw.displayModeOverrides).toBeUndefined()
  })
})
