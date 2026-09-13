import { describe, expect, it } from 'vitest'
import { create } from 'zustand'
import { createDatasetSlice, type DatasetSlice } from '../datasetSlice'
import { createProvinceEditSlice, type ProvinceEditSlice } from '../provinceEditSlice'
import { createStateEditSlice, type StateEditSlice } from '../stateEditSlice'
import type { Province, StateDefinition } from '../../../../../../shared/mapDataTypes'

type Store = DatasetSlice & ProvinceEditSlice & StateEditSlice

function makeStore() {
  return create<Store>()((...a) => ({
    ...createDatasetSlice(...a),
    ...createProvinceEditSlice(...a),
    ...createStateEditSlice(...a),
  }))
}

function province(id: number): Province {
  return { id, color: id, type: 'land', isCoastal: false, terrain: undefined, continent: undefined }
}

function state(id: number, provinceIds: number[]): StateDefinition {
  return {
    id,
    name: `STATE_${id}`,
    displayName: `STATE_${id}`,
    provinceIds,
    manpower: 0,
    stateCategory: 'rural',
    history: { owner: undefined, coreOf: [], buildings: [], victoryPoints: [], effects: [], dateHistory: [] }
  }
}

function setup() {
  const store = makeStore()
  store.getState().loadOriginalDefinitions([province(10), province(11), province(12)], 'hash')
  store.getState().replaceStates([state(1, [10, 11]), state(2, [12])])
  return store
}

describe('moveProvincesToState', () => {
  it('adds a province to a state that does not yet have any pending edit', () => {
    const store = setup()
    store.getState().moveProvincesToState([12], 1)

    expect(store.getState().pendingStateEdits.get(1)?.provinceIds).toEqual([10, 11, 12])
    // Its previous owner is marked dirty too, even though the user never
    // opened it — leaving it out would let both states claim the province.
    expect(store.getState().pendingStateEdits.get(2)?.provinceIds).toEqual([])
  })

  it('removes the province from its previous effective owner in the same call', () => {
    const store = setup()
    store.getState().moveProvincesToState([11], 2)

    expect(store.getState().pendingStateEdits.get(1)?.provinceIds).toEqual([10])
    expect(store.getState().pendingStateEdits.get(2)?.provinceIds).toEqual([12, 11])
  })

  it('removes from a state that only owns the province through a pending edit', () => {
    const store = setup()
    // First move 12 into state 1 (pending edit only, not yet on disk).
    store.getState().moveProvincesToState([12], 1)
    expect(store.getState().pendingStateEdits.get(1)?.provinceIds).toEqual([10, 11, 12])

    // Now move it again, into state 2 where it originally lived. The first
    // move already stripped it from state 2's pending province list (its
    // effective owner became state 1), so this call re-adds it there.
    store.getState().moveProvincesToState([12], 2)

    expect(store.getState().pendingStateEdits.get(1)?.provinceIds).toEqual([10, 11])
    expect(store.getState().pendingStateEdits.get(2)?.provinceIds).toEqual([12])
  })

  it('is a no-op for a province that does not exist', () => {
    const store = setup()
    store.getState().moveProvincesToState([999], 1)

    expect(store.getState().pendingStateEdits.size).toBe(0)
  })

  it('does not duplicate a province already in the target state', () => {
    const store = setup()
    store.getState().moveProvincesToState([10], 1)

    expect(store.getState().pendingStateEdits.has(1)).toBe(false)
  })

  it('accepts a province registered via pending paint but not yet saved', () => {
    const store = setup()
    store.getState().syncBmpOnlyEntries([500])
    const guid = store.getState().bmpOnlyByColor.get(500)!
    store.getState().assignBmpProvince(guid, { type: 'register', assignedId: 13 })

    store.getState().moveProvincesToState([13], 1)

    expect(store.getState().pendingStateEdits.get(1)?.provinceIds).toEqual([10, 11, 13])
  })

  it('captures a baseline the first time a state is touched, for both source and target', () => {
    const store = setup()
    store.getState().moveProvincesToState([11], 2)

    expect(store.getState().stateEditBaselines.get(1)).toEqual(state(1, [10, 11]))
    expect(store.getState().stateEditBaselines.get(2)).toEqual(state(2, [12]))
  })

  it('unassigns a province from its state without assigning it elsewhere when target is null', () => {
    const store = setup()
    store.getState().moveProvincesToState([11], null)

    expect(store.getState().pendingStateEdits.get(1)?.provinceIds).toEqual([10])
    expect(store.getState().pendingStateEdits.has(2)).toBe(false)
  })
})
