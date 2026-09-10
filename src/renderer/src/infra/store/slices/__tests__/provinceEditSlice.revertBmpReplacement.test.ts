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

describe('revertBmpReplacement', () => {
  it('restores the province to having no pending edit when it had none before the replacement', () => {
    const store = makeStore()
    store.getState().loadOriginalDefinitions([province(50)], 'hash')
    store.getState().syncBmpOnlyEntries([200])
    const guid = store.getState().bmpOnlyByColor.get(200)!
    store.getState().editBmpOnlyProvince(guid, { type: 'sea' })

    store.getState().assignBmpProvince(guid, { type: 'replace', targetId: 50 })
    expect(store.getState().pendingEdits.get(50)).toEqual({ type: 'sea' })

    store.getState().revertBmpReplacement(50)

    expect(store.getState().pendingEdits.has(50)).toBe(false)
    expect(store.getState().bmpReplacements.has(50)).toBe(false)
  })

  it("restores the province's own prior edit instead of leaving the replacement's draft merged in", () => {
    const store = makeStore()
    store.getState().loadOriginalDefinitions([province(50)], 'hash')
    store.getState().editProvince(50, { type: 'land', isCoastal: true })
    store.getState().syncBmpOnlyEntries([200])
    const guid = store.getState().bmpOnlyByColor.get(200)!
    store.getState().editBmpOnlyProvince(guid, { type: 'sea' })

    store.getState().assignBmpProvince(guid, { type: 'replace', targetId: 50 })
    // The bmp-only draft (a full 4-field object) overwrote the province's
    // own prior edit entirely, per assignBmpProvince's existing merge.
    expect(store.getState().pendingEdits.get(50)).toMatchObject({ type: 'sea' })

    store.getState().revertBmpReplacement(50)

    expect(store.getState().pendingEdits.get(50)).toEqual({ type: 'land', isCoastal: true })
  })

  it('keeps the pre-replacement backup across being reassigned to a different bmp-only color', () => {
    const store = makeStore()
    store.getState().loadOriginalDefinitions([province(50)], 'hash')
    store.getState().editProvince(50, { isCoastal: true })
    store.getState().syncBmpOnlyEntries([200, 201])
    const guidA = store.getState().bmpOnlyByColor.get(200)!
    const guidB = store.getState().bmpOnlyByColor.get(201)!

    store.getState().assignBmpProvince(guidA, { type: 'replace', targetId: 50 })
    store.getState().assignBmpProvince(guidB, { type: 'replace', targetId: 50 }) // reassigned before reverting

    store.getState().revertBmpReplacement(50)

    expect(store.getState().pendingEdits.get(50)).toEqual({ isCoastal: true })
  })

  it('is a no-op for a province that is not currently a replacement target', () => {
    const store = makeStore()
    store.getState().loadOriginalDefinitions([province(50)], 'hash')
    store.getState().editProvince(50, { type: 'land' })

    store.getState().revertBmpReplacement(50)

    expect(store.getState().pendingEdits.get(50)).toEqual({ type: 'land' })
  })
})
