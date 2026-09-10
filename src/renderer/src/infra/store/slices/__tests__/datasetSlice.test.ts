import { describe, expect, it } from 'vitest'
import { create } from 'zustand'
import { createDatasetSlice, type DatasetSlice } from '../datasetSlice'
import type { StateDefinition, StrategicRegionDefinition } from '../../../../../../shared/mapDataTypes'

function makeStore() {
  return create<DatasetSlice>()((...a) => createDatasetSlice(...a))
}

function state(id: number, sourcePath: string, provinceIds: number[] = []): StateDefinition {
  return {
    id,
    name: `STATE_${id}`,
    provinceIds,
    manpower: 0,
    stateCategory: 'rural',
    history: { owner: undefined, coreOf: [], buildings: [], victoryPoints: [], effects: [], dateHistory: [] },
    sourcePath
  }
}

function region(id: number, sourcePath: string, provinceIds: number[] = []): StrategicRegionDefinition {
  return { id, name: `STRATEGICREGION_${id}`, provinceIds, weatherPeriods: [], sourcePath }
}

describe('appendStates', () => {
  it('does not keep both entries when two files define the same state ID', () => {
    // A mod file coexisting with the game's own file for the same ID, as
    // pathResolver's folder merge (dedupes by filename only) allows.
    const store = makeStore()
    store.getState().appendStates([state(1, 'game/1.txt', [10])])
    store.getState().appendStates([state(1, 'mod/1-override.txt', [10, 11])])

    expect(store.getState().states).toHaveLength(1)
    expect(store.getState().statesById.size).toBe(1)
    // The array and the map must agree on which entry survived.
    expect(store.getState().states[0]).toBe(store.getState().statesById.get(1))
  })

  it('the surviving entry is the one added last', () => {
    const store = makeStore()
    store.getState().appendStates([state(1, 'game/1.txt')])
    store.getState().appendStates([state(1, 'mod/1-override.txt')])

    expect(store.getState().states[0].sourcePath).toBe('mod/1-override.txt')
  })

  it('keeps distinct states, sorted by id', () => {
    const store = makeStore()
    store.getState().appendStates([state(3, 'a.txt'), state(1, 'b.txt')])
    store.getState().appendStates([state(2, 'c.txt')])

    expect(store.getState().states.map((s) => s.id)).toEqual([1, 2, 3])
  })

  it('rebuilds stateProvinceToStateId from the deduplicated states, not the raw input', () => {
    const store = makeStore()
    store.getState().appendStates([state(1, 'game/1.txt', [10])])
    store.getState().appendStates([state(1, 'mod/1-override.txt', [20])])

    expect(store.getState().stateProvinceToStateId.get(20)).toBe(1)
    expect(store.getState().stateProvinceToStateId.has(10)).toBe(false)
  })
})

describe('appendStrategicRegions', () => {
  it('does not keep both entries when two files define the same region ID', () => {
    const store = makeStore()
    store.getState().appendStrategicRegions([region(1, 'game/1.txt')])
    store.getState().appendStrategicRegions([region(1, 'mod/1-override.txt')])

    expect(store.getState().strategicRegions).toHaveLength(1)
    expect(store.getState().strategicRegionsById.size).toBe(1)
    expect(store.getState().strategicRegions[0].sourcePath).toBe('mod/1-override.txt')
  })
})
