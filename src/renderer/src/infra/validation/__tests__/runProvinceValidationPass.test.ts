import { describe, expect, it } from 'vitest'
import { runValidationForCatalog, runValidationForProvince } from '../runProvinceValidationPass'
import type { ProvinceCatalogEntry } from '../../../../../shared/provinceCatalog'
import type { ProvinceValidationSnapshot } from '../../../../../shared/provinceValidation'

function province(overrides: Partial<ProvinceCatalogEntry> = {}): ProvinceCatalogEntry {
  return {
    key: `definition:${overrides.id ?? 1}`,
    id: 1,
    color: 0x112233,
    type: 'land',
    isCoastal: false,
    terrain: 'plains',
    continent: 'europe',
    canonical: true,
    sources: ['definitions'],
    mapPresence: 'present',
    ...overrides
  }
}

function snapshot(catalog: ProvinceCatalogEntry[]): ProvinceValidationSnapshot {
  return {
    catalog,
    catalogByKey: new Map(catalog.map((entry) => [entry.key, entry])),
    terrains: new Map([['plains', { codeName: 'plains' } as any]]),
    continents: new Map([['europe', { codeName: 'europe', position: 1 } as any]])
  }
}

describe('runValidationForCatalog', () => {
  it('runs only metadata validators when includeFullPhase is false', () => {
    // province/bmp-color-without-definition is a 'full' phase validator, so
    // this should never fire when includeFullPhase is false.
    const catalog = [province({ id: 1, key: 'definition:1', sources: ['bmp-color'] })]
    const result = runValidationForCatalog(snapshot(catalog), false)
    expect(result.phase).toBe('metadata')
    expect(result.issues.some((i) => i.code === 'province.bmp-color-without-definition')).toBe(false)
  })

  it('runs both phases and merges their summaries when includeFullPhase is true', () => {
    const catalog = [province({ id: 1, key: 'definition:1', sources: ['bmp-color'] })]
    const result = runValidationForCatalog(snapshot(catalog), true)
    expect(result.phase).toBe('full')
    expect(result.issues.some((i) => i.code === 'province.bmp-color-without-definition')).toBe(true)
    expect(result.summary.errorCount).toBeGreaterThan(0)
  })

  it('flags duplicate province ids across the whole catalog', () => {
    const catalog = [
      province({ id: 5, key: 'definition:5' }),
      province({ id: 5, key: 'definition:6' }) // same id, different catalog key
    ]
    const result = runValidationForCatalog(snapshot(catalog), false)
    expect(result.issues.filter((i) => i.code === 'province.duplicate-id')).toHaveLength(2)
  })

  it('produces no issues for a fully valid catalog', () => {
    const catalog = [
      province({ id: 1, key: 'definition:1', color: 0x112233 }),
      province({ id: 2, key: 'definition:2', color: 0x445566 })
    ]
    const result = runValidationForCatalog(snapshot(catalog), true)
    expect(result.issues).toEqual([])
    expect(result.summary).toEqual({ infoCount: 0, warningCount: 0, errorCount: 0 })
  })
})

describe('runValidationForProvince', () => {
  it('returns issues for only the requested province, not the whole catalog', () => {
    const catalog = [
      province({ id: 1, key: 'definition:1', terrain: null }), // missing terrain -> warning
      province({ id: 2, key: 'definition:2' }) // valid
    ]
    const issues = runValidationForProvince(snapshot(catalog), false, 'definition:1')
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.every((i) => i.provinceKey === 'definition:1')).toBe(true)
  })

  it('returns no issues for an unknown province key', () => {
    const catalog = [province({ id: 1, key: 'definition:1' })]
    const issues = runValidationForProvince(snapshot(catalog), true, 'definition:999')
    expect(issues).toEqual([])
  })

  it('still evaluates catalog-wide validators (like duplicate-id) scoped to the requested province', () => {
    const catalog = [
      province({ id: 5, key: 'definition:5' }),
      province({ id: 5, key: 'definition:6' })
    ]
    const issues = runValidationForProvince(snapshot(catalog), false, 'definition:5')
    expect(issues.some((i) => i.code === 'province.duplicate-id')).toBe(true)
    expect(issues.every((i) => i.provinceKey === 'definition:5')).toBe(true)
  })
})
