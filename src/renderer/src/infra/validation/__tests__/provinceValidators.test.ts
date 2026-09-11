import { describe, expect, it } from 'vitest'
import { provinceValidators } from '../provinceValidators'
import { buildProvinceCatalog } from '../../../../../shared/provinceCatalog'
import { runProvinceValidation } from '../../../../../shared/provinceValidation'
import type { ProvinceValidationSnapshot } from '../../../../../shared/provinceValidation'
import type { Province } from '../../../../../shared/mapDataTypes'

function province(id: number, overrides: Partial<Province> = {}): Province {
  return { id, color: id, type: 'land', isCoastal: false, terrain: 'plains', continent: 'europe', ...overrides }
}

function snapshotFor(provinces: Province[]): ProvinceValidationSnapshot {
  const catalog = buildProvinceCatalog(provinces)
  return {
    catalog,
    catalogByKey: new Map(catalog.map((entry) => [entry.key, entry])),
    terrains: new Map([['plains', { codeName: 'plains', color: 0 }]]),
    continents: new Map([['europe', { codeName: 'europe', position: 1 }]])
  }
}

describe('province/id-gap', () => {
  it('reports exactly one issue for a gap, not the missing type/color/terrain warnings', () => {
    // id 2 is skipped, producing a gap entry between provinces 1 and 3.
    const snapshot = snapshotFor([province(1), province(3)])
    const result = runProvinceValidation(snapshot, provinceValidators, 'metadata')

    const gapIssues = result.issues.filter((i) => i.provinceId === 2)
    expect(gapIssues).toHaveLength(1)
    expect(gapIssues[0]).toMatchObject({ code: 'province.id-gap', severity: 'error', messageParams: { id: 2 } })
  })

  it('does not suppress the normal missing-field warnings for a real (non-gap) province', () => {
    const snapshot = snapshotFor([
      province(1),
      { id: 2, color: 2, type: undefined, isCoastal: undefined, terrain: undefined, continent: undefined }
    ])
    const result = runProvinceValidation(snapshot, provinceValidators, 'metadata')

    const codesForProvince2 = result.issues.filter((i) => i.provinceId === 2).map((i) => i.code)
    expect(codesForProvince2).toEqual(
      expect.arrayContaining(['province.missing-type', 'province.missing-terrain'])
    )
    expect(codesForProvince2).not.toContain('province.id-gap')
  })
})

describe('messageParams', () => {
  it('carries interpolation values for parameterized messages', () => {
    const snapshot = snapshotFor([province(1, { type: 'ocean' as never })])
    const result = runProvinceValidation(snapshot, provinceValidators, 'metadata')

    const invalidType = result.issues.find((i) => i.code === 'province.invalid-type')
    expect(invalidType?.messageParams).toEqual({ type: 'ocean' })
  })

  it('carries the shared id for duplicate-id issues', () => {
    const snapshot = snapshotFor([province(1), { ...province(2), id: 1, color: 999 }])
    const result = runProvinceValidation(snapshot, provinceValidators, 'metadata')

    const duplicates = result.issues.filter((i) => i.code === 'province.duplicate-id')
    expect(duplicates).toHaveLength(2)
    expect(duplicates.every((i) => i.messageParams?.id === 1)).toBe(true)
  })

  it('has no messageParams for non-parameterized messages', () => {
    const snapshot = snapshotFor([{ id: 1, color: 1, type: undefined, isCoastal: undefined, terrain: undefined, continent: undefined }])
    const result = runProvinceValidation(snapshot, provinceValidators, 'metadata')

    const missingType = result.issues.find((i) => i.code === 'province.missing-type')
    expect(missingType?.messageParams).toBeUndefined()
  })
})
