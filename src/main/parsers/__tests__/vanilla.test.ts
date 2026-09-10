import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { StatesTxt } from '../StatesTxt'
import { applyStateSaves } from '../StatesTxtWriter'
import { StrategicRegionsTxt } from '../StrategicRegionsTxt'
import { applyStrategicRegionSaves } from '../StrategicRegionsTxtWriter'

// Runs against a local game install when HOI4_GAME_PATH points at one, e.g.
//   HOI4_GAME_PATH="C:/Program Files (x86)/Steam/steamapps/common/Hearts of Iron IV" npm test
// Game files are not committed to this repository.
const gamePath = process.env.HOI4_GAME_PATH
const available = !!gamePath && existsSync(join(gamePath, 'history', 'states'))

function filesIn(relative: string): string[] {
  const dir = join(gamePath!, relative)
  return readdirSync(dir).filter((file) => file.endsWith('.txt')).map((file) => join(dir, file))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

describe.skipIf(!available)('vanilla round-trip', () => {
  it('saves every state without changes byte-for-byte', () => {
    for (const file of filesIn('history/states')) {
      const source = readFileSync(file, 'utf-8')
      for (const state of StatesTxt.parse(source)) {
        const result = applyStateSaves(source, [{ original: state, updated: clone(state) }])
        expect(result.conflicts, file).toEqual([])
        expect(result.content, file).toBe(source)
      }
    }
  })

  it('writes state edits that read back exactly', () => {
    for (const file of filesIn('history/states')) {
      const source = readFileSync(file, 'utf-8')
      for (const state of StatesTxt.parse(source)) {
        const updated = clone(state)
        updated.manpower += 1
        updated.history.coreOf = [...state.history.coreOf.slice(1), 'TST']
        updated.provinceIds = [...state.provinceIds, 99999]
        const result = applyStateSaves(source, [{ original: state, updated }])
        const back = StatesTxt.parse(result.content).find((s) => s.id === state.id)
        expect(back, file).toEqual(updated)
      }
    }
  })

  it('saves every strategic region without changes byte-for-byte', () => {
    for (const file of filesIn('map/strategicregions')) {
      const source = readFileSync(file, 'utf-8')
      for (const region of StrategicRegionsTxt.parse(source)) {
        const result = applyStrategicRegionSaves(source, [{ original: region, updated: clone(region) }])
        expect(result.content, file).toBe(source)
      }
    }
  })
})
