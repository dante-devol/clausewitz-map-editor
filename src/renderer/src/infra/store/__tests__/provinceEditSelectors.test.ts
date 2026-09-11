import { describe, expect, it } from 'vitest'
import type { Province } from '../../../../../shared/mapDataTypes'
import { selectNextAvailableProvinceId, selectProvinceDraftTargetMaps } from '../provinceEditSelectors'

function province(id: number): Province {
  return { id, color: 0, type: 'land', isCoastal: false, terrain: undefined, continent: undefined }
}

describe('selectNextAvailableProvinceId', () => {
  it('returns 1 when nothing exists yet', () => {
    expect(selectNextAvailableProvinceId(new Map(), new Map())).toBe(1)
  })

  it('returns one past the highest canonical id', () => {
    const originals = new Map([1, 5, 3].map((id) => [id, province(id)]))
    expect(selectNextAvailableProvinceId(originals, new Map())).toBe(6)
  })

  it('accounts for ids already handed out to pending registrations', () => {
    const originals = new Map([[100, province(100)]])
    const pending = new Map([['guidA', 101], ['guidB', 102]])
    expect(selectNextAvailableProvinceId(originals, pending)).toBe(103)
  })

  // Regression: previously computed as `max(original) + pendingNewProvinces.size + 1`,
  // which reused an id once an earlier pending registration was reverted.
  it('does not reuse an id after an earlier pending registration is reverted', () => {
    const originals = new Map([[100, province(100)]])
    let pending = new Map([['guidA', 101], ['guidB', 102]])
    pending = new Map([...pending].filter(([guid]) => guid !== 'guidA')) // revert guidA

    expect(selectNextAvailableProvinceId(originals, pending)).toBe(103)
  })
})

describe('selectProvinceDraftTargetMaps', () => {
  const emptyArgs = [new Map(), new Map(), new Map(), new Map(), new Map(), []] as const

  it('returns the same result object when called again with the same references', () => {
    const first = selectProvinceDraftTargetMaps(...emptyArgs)
    const second = selectProvinceDraftTargetMaps(...emptyArgs)
    expect(second).toBe(first)
  })

  it('recomputes when an input reference changes', () => {
    const originals = new Map([[1, province(1)]])
    const first = selectProvinceDraftTargetMaps(originals, new Map(), new Map(), new Map(), new Map(), [])
    const second = selectProvinceDraftTargetMaps(new Map(originals), new Map(), new Map(), new Map(), new Map(), [])
    expect(second).not.toBe(first)
    expect(second.byProvinceId.get(1)).toBeDefined()
  })
})
