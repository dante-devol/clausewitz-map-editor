import { describe, expect, it } from 'vitest'
import {
  getDisplayModeSampleValueKey,
  isEditableDisplayMode,
  sampleDisplayModeValue
} from '../displayModes'
import type { ProvinceDraftTarget } from '../../../../../shared/provinceEditing'

function draft(provinceId: number | null): ProvinceDraftTarget {
  return {
    provinceId,
    bmpGuid: null,
    color: 0,
    source: 'canonical',
    status: 'canonical',
    type: undefined,
    isCoastal: undefined,
    terrain: undefined,
    continent: undefined
  }
}

describe('isEditableDisplayMode for state/strategicRegion', () => {
  it('treats state and strategicRegion as editable but not configurable', () => {
    expect(isEditableDisplayMode('state')).toBe(true)
    expect(isEditableDisplayMode('strategicRegion')).toBe(true)
  })
})

describe('sampleDisplayModeValue for state', () => {
  const context = {
    stateProvinceToStateId: new Map([[10, 5]]),
    strategicRegionProvinceToRegionId: new Map<number, number>()
  }

  it('samples the province\'s current state id', () => {
    expect(sampleDisplayModeValue('state', draft(10), context)).toEqual({ mode: 'state', value: 5 })
  })

  it('samples undefined ("no state") for a province with no state', () => {
    expect(sampleDisplayModeValue('state', draft(11), context)).toEqual({ mode: 'state', value: undefined })
  })

  it('samples undefined for an unregistered province (no provinceId)', () => {
    expect(sampleDisplayModeValue('state', draft(null), context)).toEqual({ mode: 'state', value: undefined })
  })

  it('samples undefined when no context is given', () => {
    expect(sampleDisplayModeValue('state', draft(10))).toEqual({ mode: 'state', value: undefined })
  })
})

describe('sampleDisplayModeValue for strategicRegion', () => {
  const context = {
    stateProvinceToStateId: new Map<number, number>(),
    strategicRegionProvinceToRegionId: new Map([[20, 7]])
  }

  it('samples the province\'s current region id', () => {
    expect(sampleDisplayModeValue('strategicRegion', draft(20), context)).toEqual({ mode: 'strategicRegion', value: 7 })
  })

  it('samples undefined for a province with no region', () => {
    expect(sampleDisplayModeValue('strategicRegion', draft(21), context)).toEqual({ mode: 'strategicRegion', value: undefined })
  })
})

describe('getDisplayModeSampleValueKey for state/strategicRegion', () => {
  it('renders a numeric id as its string form', () => {
    expect(getDisplayModeSampleValueKey({ mode: 'state', value: 5 })).toBe('5')
    expect(getDisplayModeSampleValueKey({ mode: 'strategicRegion', value: 7 })).toBe('7')
  })

  it('renders "no state"/"no region" as the "none" key', () => {
    expect(getDisplayModeSampleValueKey({ mode: 'state', value: undefined })).toBe('none')
    expect(getDisplayModeSampleValueKey({ mode: 'strategicRegion', value: undefined })).toBe('none')
  })
})
