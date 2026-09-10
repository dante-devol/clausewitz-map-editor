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
  return { id, name: `STRATEGICREGION_${id}`, provinceIds, weatherPeriods: [] }
}

function setup() {
  const store = makeStore()
  store.getState().loadOriginalDefinitions([province(10), province(11), province(12)], 'hash')
  store.getState().replaceStrategicRegions([region(1, [10, 11]), region(2, [12])])
  return store
}

describe('moveProvincesToRegion', () => {
  it('adds a province to a region and removes it from its previous owner', () => {
    const store = setup()
    store.getState().moveProvincesToRegion([11], 2)

    expect(store.getState().pendingStrategicRegionEdits.get(1)?.provinceIds).toEqual([10])
    expect(store.getState().pendingStrategicRegionEdits.get(2)?.provinceIds).toEqual([12, 11])
  })

  it('is a no-op for a province that does not exist', () => {
    const store = setup()
    store.getState().moveProvincesToRegion([999], 1)

    expect(store.getState().pendingStrategicRegionEdits.size).toBe(0)
  })

  it('does not duplicate a province already in the target region', () => {
    const store = setup()
    store.getState().moveProvincesToRegion([10], 1)

    expect(store.getState().pendingStrategicRegionEdits.has(1)).toBe(false)
  })
})
