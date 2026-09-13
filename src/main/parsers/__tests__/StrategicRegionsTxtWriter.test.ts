import { describe, expect, it } from 'vitest'
import type { StrategicRegionDefinition } from '../../../shared/mapDataTypes'
import { StrategicRegionsTxt } from '../StrategicRegionsTxt'
import { newRegionLines, removeRegions } from '../StrategicRegionsTxtWriter'

const TWO_REGION_FILE = `
strategic_region = {
	id = 77
	name = "STRATEGICREGION_77"
	provinces = { 10 11 12 }
}

strategic_region = {
	id = 78
	name = "STRATEGICREGION_78"
	provinces = { 13 }
}
`

function emptyRegion(id: number, provinceIds: number[]): StrategicRegionDefinition {
  return { id, name: `New Region ${id}`, displayName: `New Region ${id}`, provinceIds, weatherPeriods: [] }
}

describe('removeRegions', () => {
  it('removes only the matching region block, leaving the rest of the file untouched', () => {
    const result = removeRegions(TWO_REGION_FILE, [77])

    expect(result.remainingCount).toBe(1)
    const remaining = StrategicRegionsTxt.parse(result.content)
    expect(remaining.map((r) => r.id)).toEqual([78])
    expect(result.content).not.toContain('STRATEGICREGION_77')
  })

  it('removes multiple regions in one pass', () => {
    const result = removeRegions(TWO_REGION_FILE, [77, 78])

    expect(result.remainingCount).toBe(0)
    expect(StrategicRegionsTxt.parse(result.content)).toHaveLength(0)
  })

  it('is a no-op when the id is not present', () => {
    const result = removeRegions(TWO_REGION_FILE, [999])

    expect(result.content).toBe(TWO_REGION_FILE)
    expect(result.remainingCount).toBe(2)
  })
})

describe('newRegionLines', () => {
  it('generates a block that parses back into an equivalent region', () => {
    const region: StrategicRegionDefinition = {
      id: 80,
      name: 'STRATEGICREGION_80',
      displayName: 'STRATEGICREGION_80',
      provinceIds: [20, 21],
      weatherPeriods: [{ between: [0, 30], temperature: [0, 10], weatherWeights: { no_phenomenon: 1 } }]
    }

    const content = newRegionLines(region).join('\n')
    const [parsed] = StrategicRegionsTxt.parse(content)

    expect(parsed.id).toBe(80)
    expect(parsed.name).toBe('STRATEGICREGION_80')
    expect(parsed.provinceIds).toEqual([20, 21])
    expect(parsed.weatherPeriods).toEqual(region.weatherPeriods)
  })

  it('omits the weather block when there are no periods', () => {
    const content = newRegionLines(emptyRegion(1, [10])).join('\n')
    expect(content).not.toContain('weather')
  })

  it('round-trips through removeRegions when appended into an existing file', () => {
    const created = newRegionLines(emptyRegion(79, [14])).join('\n')
    const combined = `${TWO_REGION_FILE}\n${created}\n`

    expect(StrategicRegionsTxt.parse(combined).map((r) => r.id).sort()).toEqual([77, 78, 79])

    const result = removeRegions(combined, [79])
    expect(StrategicRegionsTxt.parse(result.content).map((r) => r.id).sort()).toEqual([77, 78])
  })
})
