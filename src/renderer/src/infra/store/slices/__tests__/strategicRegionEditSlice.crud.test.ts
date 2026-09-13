import { describe, expect, it } from 'vitest'
import { create } from 'zustand'
import { createDatasetSlice, type DatasetSlice } from '../datasetSlice'
import { createProvinceEditSlice, type ProvinceEditSlice } from '../provinceEditSlice'
import { createStrategicRegionEditSlice, type StrategicRegionEditSlice } from '../strategicRegionEditSlice'
import type { Province, StrategicRegionDefinition } from '../../../../../../shared/mapDataTypes'

type Store = DatasetSlice & ProvinceEditSlice & StrategicRegionEditSlice

function makeStore() {
  return create<Store>()((...a) => ({
    ...createDatasetSlice(...a),
    ...createProvinceEditSlice(...a),
    ...createStrategicRegionEditSlice(...a),
  }))
}

function province(id: number): Province {
  return { id, color: id, type: 'land', isCoastal: false, terrain: undefined, continent: undefined }
}

function region(id: number, provinceIds: number[]): StrategicRegionDefinition {
  return { id, name: `STRATEGICREGION_${id}`, displayName: `STRATEGICREGION_${id}`, provinceIds, weatherPeriods: [] }
}

function setup() {
  const store = makeStore()
  store.getState().loadOriginalDefinitions([province(10), province(11), province(12)], 'hash')
  store.getState().replaceStrategicRegions([region(1, [10, 11]), region(2, [12])])
  return store
}

describe('createStrategicRegion', () => {
  it('assigns the next-available id above any loaded region', () => {
    const store = setup()
    const id = store.getState().createStrategicRegion()

    expect(id).toBe(3)
    expect(store.getState().pendingNewStrategicRegions.get(3)).toMatchObject({ id: 3, provinceIds: [] })
  })

  it('lets moveProvincesToRegion target a newly-created region', () => {
    const store = setup()
    const id = store.getState().createStrategicRegion()
    store.getState().moveProvincesToRegion([12], id)

    expect(store.getState().pendingStrategicRegionEdits.get(id)?.provinceIds).toEqual([12])
    expect(store.getState().pendingStrategicRegionEdits.get(2)?.provinceIds).toEqual([])
  })
})

describe('deleteStrategicRegion', () => {
  it('marks an on-disk region for deletion without touching its provinces', () => {
    const store = setup()
    store.getState().deleteStrategicRegion(1)

    expect(store.getState().pendingStrategicRegionDeletions.has(1)).toBe(true)
    expect(store.getState().strategicRegionsById.get(1)?.provinceIds).toEqual([10, 11])
  })

  it('drops a pending-new region outright instead of marking it deleted', () => {
    const store = setup()
    const id = store.getState().createStrategicRegion()
    store.getState().deleteStrategicRegion(id)

    expect(store.getState().pendingNewStrategicRegions.has(id)).toBe(false)
    expect(store.getState().pendingStrategicRegionDeletions.has(id)).toBe(false)
  })
})

describe('revertStrategicRegionEdit on created/deleted regions', () => {
  it('fully discards a pending-new region', () => {
    const store = setup()
    const id = store.getState().createStrategicRegion()
    store.getState().editStrategicRegion(id, { name: 'Foo' })
    store.getState().revertStrategicRegionEdit(id)

    expect(store.getState().pendingNewStrategicRegions.has(id)).toBe(false)
    expect(store.getState().pendingStrategicRegionEdits.has(id)).toBe(false)
  })

  it('unmarks a pending deletion', () => {
    const store = setup()
    store.getState().deleteStrategicRegion(2)
    store.getState().revertStrategicRegionEdit(2)

    expect(store.getState().pendingStrategicRegionDeletions.has(2)).toBe(false)
  })
})
