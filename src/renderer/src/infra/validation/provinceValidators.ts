import type { ProvinceType } from '../../../../shared/mapDataTypes'
import type { ProvinceCatalogEntry } from '../../../../shared/provinceCatalog'
import type {
  ProvinceValidationIssue,
  ProvinceValidationSnapshot,
  ProvinceValidator
} from '../../../../shared/provinceValidation'

const VALID_TYPES = new Set<ProvinceType>(['land', 'sea', 'lake'])

export const provinceValidators: readonly ProvinceValidator[] = [
  {
    id: 'province/id-valid',
    phase: 'metadata',
    validate(snapshot, province) {
      return subjectProvinces(snapshot, province).flatMap((province) => {
        if (province.id === null) {
          return [issue('province.missing-id', 'warning', province)]
        }
        if (province.id === 0) return []
        if (!Number.isInteger(province.id) || province.id <= 0) {
          return [issue('province.invalid-id', 'error', province)]
        }
        return []
      })
    }
  },
  {
    id: 'province/id-unique',
    phase: 'metadata',
    validate(snapshot, province) {
      return collectDuplicateIssues(snapshot, province, 'id', 'province.duplicate-id', 'warning', (value) => ({ id: value }))
    }
  },
  // A gap entry (an ID between two real provinces that no definition uses)
  // is reported once here rather than through type/color/terrain-valid below
  // — those would each separately call it "missing", which is both noisy and
  // beside the point: the actual problem is that HOI4 needs contiguous IDs.
  {
    id: 'province/id-gap',
    phase: 'metadata',
    validate(snapshot, province) {
      return subjectProvinces(snapshot, province).flatMap((province) => {
        if (!province.sources.includes('id-gap')) return []
        return [issue('province.id-gap', 'error', province, { id: province.id ?? '' })]
      })
    }
  },
  {
    id: 'province/type-valid',
    phase: 'metadata',
    validate(snapshot, province) {
      return subjectProvinces(snapshot, province).flatMap((province) => {
        if (province.sources.includes('id-gap')) return []
        if (province.type === null) {
          return [issue('province.missing-type', 'warning', province)]
        }
        if (!VALID_TYPES.has(province.type)) {
          return [issue('province.invalid-type', 'warning', province, { type: province.type })]
        }
        return []
      })
    }
  },
  {
    id: 'province/color-valid',
    phase: 'metadata',
    validate(snapshot, province) {
      return subjectProvinces(snapshot, province).flatMap((province) => {
        if (province.id === 0) return []
        if (province.sources.includes('id-gap')) return []
        if (province.color === null) {
          return [issue('province.missing-color', 'warning', province)]
        }
        if (!Number.isInteger(province.color) || province.color < 0 || province.color > 0xffffff) {
          return [issue('province.invalid-color', 'warning', province)]
        }
        return []
      })
    }
  },
  {
    id: 'province/color-unique',
    phase: 'metadata',
    validate(snapshot, province) {
      return collectDuplicateIssues(snapshot, province, 'color', 'province.duplicate-color', 'warning', (value) => ({
        color: formatPackedColor(value)
      }))
    }
  },
  {
    id: 'province/terrain-valid',
    phase: 'metadata',
    validate(snapshot, province) {
      return subjectProvinces(snapshot, province).flatMap((province) => {
        if (province.sources.includes('id-gap')) return []
        if (!province.terrain) {
          return [issue('province.missing-terrain', 'warning', province)]
        }
        if (!snapshot.terrains.has(province.terrain)) {
          return [issue('province.invalid-terrain', 'warning', province, { terrain: province.terrain })]
        }
        return []
      })
    }
  },
  {
    id: 'province/color-present-on-map',
    phase: 'full',
    validate(snapshot, province) {
      return subjectProvinces(snapshot, province).flatMap((province) => {
        if (province.id === 0) return []
        if (province.color === null) return []
        if (province.sources.includes('bmp-color')) return []
        if (province.mapPresence === 'missing') {
          return [issue('province.color-missing-on-map', 'warning', province)]
        }
        return []
      })
    }
  },
  {
    id: 'province/bmp-color-without-definition',
    phase: 'full',
    validate(snapshot, province) {
      return subjectProvinces(snapshot, province).flatMap((province) => {
        if (!province.sources.includes('bmp-color')) return []
        return [issue('province.bmp-color-without-definition', 'error', province)]
      })
    }
  }
]

function collectDuplicateIssues(
  snapshot: ProvinceValidationSnapshot,
  subjectProvince: ProvinceCatalogEntry | undefined,
  field: 'id' | 'color',
  code: string,
  severity: ProvinceValidationIssue['severity'],
  paramsForValue: (value: number) => Record<string, string | number>
): ProvinceValidationIssue[] {
  const seen = new Map<number, ProvinceCatalogEntry[]>()

  for (const province of snapshot.catalog) {
    const value = province[field]
    if (value === null) continue
    const existing = seen.get(value)
    if (existing) existing.push(province)
    else seen.set(value, [province])
  }

  const issues: ProvinceValidationIssue[] = []
  for (const [value, provinces] of seen) {
    if (provinces.length < 2) continue
    for (const province of provincesForDuplicateGroup(provinces, subjectProvince)) {
      issues.push(issue(code, severity, province, paramsForValue(value)))
    }
  }

  return issues
}

function issue(
  code: string,
  severity: ProvinceValidationIssue['severity'],
  province: ProvinceCatalogEntry,
  messageParams?: Record<string, string | number>
): ProvinceValidationIssue {
  return {
    code,
    severity,
    provinceKey: province.key,
    provinceId: province.id,
    messageParams
  }
}

function formatPackedColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0').toUpperCase()}`
}

function subjectProvinces(
  snapshot: ProvinceValidationSnapshot,
  province?: ProvinceCatalogEntry
): readonly ProvinceCatalogEntry[] {
  return province ? [province] : snapshot.catalog
}

function provincesForDuplicateGroup(
  provinces: ProvinceCatalogEntry[],
  subjectProvince: ProvinceCatalogEntry | undefined
): ProvinceCatalogEntry[] {
  if (!subjectProvince) return provinces
  return provinces.filter((province) => province.key === subjectProvince.key)
}
