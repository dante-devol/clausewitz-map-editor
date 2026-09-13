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

describe('createState', () => {
  it('assigns the next-available id above any loaded state', () => {
    const store = setup()
    const id = store.getState().createState()

    expect(id).toBe(3)
    expect(store.getState().pendingNewStates.get(3)).toMatchObject({ id: 3, provinceIds: [], name: 'New State' })
  })

  it('assigns increasing ids across multiple creations in the same session', () => {
    const store = setup()
    const first = store.getState().createState()
    const second = store.getState().createState()

    expect(first).toBe(3)
    expect(second).toBe(4)
  })

  it('starts at 1 when there are no loaded states', () => {
    const store = makeStore()
    expect(store.getState().createState()).toBe(1)
  })

  it('lets moveProvincesToState target a newly-created state', () => {
    const store = setup()
    const id = store.getState().createState()
    store.getState().moveProvincesToState([12], id)

    expect(store.getState().pendingStateEdits.get(id)?.provinceIds).toEqual([12])
    expect(store.getState().pendingStateEdits.get(2)?.provinceIds).toEqual([])
  })
})

describe('deleteState', () => {
  it('marks an on-disk state for deletion without touching its provinces', () => {
    const store = setup()
    store.getState().deleteState(1)

    expect(store.getState().pendingStateDeletions.has(1)).toBe(true)
    expect(store.getState().statesById.get(1)?.provinceIds).toEqual([10, 11])
  })

  it('drops a pending-new state outright instead of marking it deleted', () => {
    const store = setup()
    const id = store.getState().createState()
    store.getState().deleteState(id)

    expect(store.getState().pendingNewStates.has(id)).toBe(false)
    expect(store.getState().pendingStateDeletions.has(id)).toBe(false)
  })

  it('discards any pending field edit on a state being deleted', () => {
    const store = setup()
    store.getState().editState(1, { name: 'renamed' })
    store.getState().deleteState(1)

    expect(store.getState().pendingStateEdits.has(1)).toBe(false)
    expect(store.getState().pendingStateDeletions.has(1)).toBe(true)
  })
})

describe('revertStateEdit on created/deleted states', () => {
  it('fully discards a pending-new state', () => {
    const store = setup()
    const id = store.getState().createState()
    store.getState().editState(id, { name: 'Foo' })
    store.getState().revertStateEdit(id)

    expect(store.getState().pendingNewStates.has(id)).toBe(false)
    expect(store.getState().pendingStateEdits.has(id)).toBe(false)
  })

  it('unmarks a pending deletion', () => {
    const store = setup()
    store.getState().deleteState(2)
    store.getState().revertStateEdit(2)

    expect(store.getState().pendingStateDeletions.has(2)).toBe(false)
  })
})
