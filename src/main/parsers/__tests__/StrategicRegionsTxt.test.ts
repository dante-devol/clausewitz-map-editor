import { describe, expect, it } from 'vitest'
import type { StrategicRegionDefinition } from '../../../shared/mapDataTypes'
import { StrategicRegionsTxt } from '../StrategicRegionsTxt'
import { applyStrategicRegionSaves } from '../StrategicRegionsTxtWriter'

const REGION_FILE = `
strategic_region={
	id=77
	name="STRATEGICREGION_77"
	provinces={
		10 11 12
		# 13 14
	}
	naval_terrain=water_fjords
	weather={
		period={
			between={ 0.0 30.1 }
			temperature={ -18.0 -2.0 }
			no_phenomenon=0.500
			snow=0.300
			min_snow_level=0.000
		}
		period={
			between={ 1.2 30.5 }
			temperature={ 4.0 12.0 }
			temperature_day_night={ 3.0 -3.0 }
			no_phenomenon=0.800
			min_snow_level=0.000
		}
	}
}
`

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function parseOne(content: string): StrategicRegionDefinition {
  return StrategicRegionsTxt.parse(content)[0]
}

describe('StrategicRegionsTxt.parse', () => {
  const region = parseOne(REGION_FILE)

  it('keeps negative temperatures', () => {
    expect(region.weatherPeriods[0].temperature).toEqual([-18, -2])
  })

  it('ignores commented-out provinces', () => {
    expect(region.provinceIds).toEqual([10, 11, 12])
  })

  it('reads weights but not structural keys', () => {
    expect(region.weatherPeriods[1].weatherWeights).toEqual({ no_phenomenon: 0.8 })
    expect(region.weatherPeriods[0].minSnowLevel).toBe(0)
  })
})

describe('applyStrategicRegionSaves', () => {
  const region = parseOne(REGION_FILE)

  it('leaves the file byte-for-byte unchanged when nothing was edited', () => {
    const result = applyStrategicRegionSaves(REGION_FILE, [{ original: region, updated: clone(region) }])
    expect(result.content).toBe(REGION_FILE)
  })

  it('edits a temperature without touching unmodelled keys', () => {
    const updated = clone(region)
    updated.weatherPeriods[0].temperature = [-25, -1]
    const result = applyStrategicRegionSaves(REGION_FILE, [{ original: region, updated }])
    expect(result.content).toBe(REGION_FILE.replace('temperature={ -18.0 -2.0 }', 'temperature={ -25.0 -1.0 }'))
  })

  it('adds, changes and removes weights', () => {
    const updated = clone(region)
    updated.weatherPeriods[0].weatherWeights = { no_phenomenon: 0.4, rain_light: 0.2 }
    const result = applyStrategicRegionSaves(REGION_FILE, [{ original: region, updated }])
    expect(result.content).toContain('no_phenomenon=0.4')
    expect(result.content).not.toContain('snow=0.300')
    expect(result.content).toContain('naval_terrain=water_fjords')
    expect(parseOne(result.content)).toEqual(updated)
  })

  it('removes a period', () => {
    const updated = clone(region)
    updated.weatherPeriods.pop()
    const result = applyStrategicRegionSaves(REGION_FILE, [{ original: region, updated }])
    expect(result.content).not.toContain('temperature_day_night')
    expect(parseOne(result.content)).toEqual(updated)
  })

  it('appends a new period after the existing ones', () => {
    const updated = clone(region)
    updated.weatherPeriods.push({ between: [0.3, 5.3], temperature: [-3, 1], weatherWeights: { snow: 0.5 } })
    const result = applyStrategicRegionSaves(REGION_FILE, [{ original: region, updated }])
    expect(result.content).toContain('temperature_day_night={ 3.0 -3.0 }')
    expect(result.content).toContain('\t\tperiod = {\n\t\t\tbetween = { 0.3 5.3 }')
    expect(parseOne(result.content)).toEqual(updated)
  })

  it('refuses to overwrite weather that also changed on disk', () => {
    const diskFile = REGION_FILE.replace('snow=0.300', 'snow=0.900')
    const updated = clone(region)
    updated.weatherPeriods[0].temperature = [0, 5]
    const result = applyStrategicRegionSaves(diskFile, [{ original: region, updated }])
    expect(result.conflicts).toEqual([expect.stringContaining('weather')])
    expect(result.content).toBe(diskFile)
  })
})
