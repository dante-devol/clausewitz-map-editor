import { describe, expect, it } from 'vitest'
import { create } from 'zustand'
import { createProvinceEditSlice, type ProvinceEditSlice } from '../provinceEditSlice'
import type { Province } from '../../../../../../shared/mapDataTypes'

function province(id: number): Province {
  return { id, color: id, type: 'land', isCoastal: false, terrain: undefined, continent: undefined }
}

function makeStore() {
  return create<ProvinceEditSlice>()((...a) => createProvinceEditSlice(...a))
}

describe('assignBmpProvince register', () => {
  it('registers a new id that is not taken', () => {
    const store = makeStore()
    store.getState().loadOriginalDefinitions([province(100)], 'hash')
    store.getState().syncBmpOnlyEntries([200])
    const guid = store.getState().bmpOnlyByColor.get(200)!

    store.getState().assignBmpProvince(guid, { type: 'register', assignedId: 101 })

    expect(store.getState().pendingNewProvinces.get(guid)).toBe(101)
  })

  it('refuses to register an id already used by a canonical province', () => {
    const store = makeStore()
    store.getState().loadOriginalDefinitions([province(100)], 'hash')
    store.getState().syncBmpOnlyEntries([200])
    const guid = store.getState().bmpOnlyByColor.get(200)!

    expect(() => store.getState().assignBmpProvince(guid, { type: 'register', assignedId: 100 })).toThrow(/already in use/)
    expect(store.getState().pendingNewProvinces.has(guid)).toBe(false)
  })

  it('refuses to register an id already claimed by another pending registration', () => {
    const store = makeStore()
    store.getState().loadOriginalDefinitions([province(100)], 'hash')
    store.getState().syncBmpOnlyEntries([200, 201])
    const guidA = store.getState().bmpOnlyByColor.get(200)!
    const guidB = store.getState().bmpOnlyByColor.get(201)!

    store.getState().assignBmpProvince(guidA, { type: 'register', assignedId: 101 })

    expect(() => store.getState().assignBmpProvince(guidB, { type: 'register', assignedId: 101 })).toThrow(/already in use/)
  })

  it('allows re-registering the same guid at the same id (no false self-collision)', () => {
    const store = makeStore()
    store.getState().loadOriginalDefinitions([province(100)], 'hash')
    store.getState().syncBmpOnlyEntries([200])
    const guid = store.getState().bmpOnlyByColor.get(200)!

    store.getState().assignBmpProvince(guid, { type: 'register', assignedId: 101 })
    expect(() => store.getState().assignBmpProvince(guid, { type: 'register', assignedId: 101 })).not.toThrow()
    expect(store.getState().pendingNewProvinces.get(guid)).toBe(101)
  })
})
