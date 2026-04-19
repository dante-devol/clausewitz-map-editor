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
    validate(snapshot) {
      return snapshot.catalog.flatMap((province) => {
        if (province.id === null) {
          return [issue('province.missing-id', 'warning', province, 'Province has no ID.')]
        }
        if (!Number.isInteger(province.id) || province.id <= 0) {
          return [issue('province.invalid-id', 'error', province, 'Province ID must be a positive integer.')]
        }
        return []
      })
    }
  },
  {
    id: 'province/id-unique',
    phase: 'metadata',
    validate(snapshot) {
      return collectDuplicateIssues(snapshot, 'id', 'province.duplicate-id', 'warning', (value) => (
        `Province ID ${value} is used more than once.`
      ))
    }
  },
  {
    id: 'province/type-valid',
    phase: 'metadata',
    validate(snapshot) {
      return snapshot.catalog.flatMap((province) => {
        if (province.type === null) {
          return [issue('province.missing-type', 'warning', province, 'Province type is missing.')]
        }
        if (!VALID_TYPES.has(province.type)) {
          return [issue('province.invalid-type', 'warning', province, `Province type "${province.type}" is invalid.`)]
        }
        return []
      })
    }
  },
  {
    id: 'province/color-valid',
    phase: 'metadata',
    validate(snapshot) {
      return snapshot.catalog.flatMap((province) => {
        if (province.color === null) {
          return [issue('province.missing-color', 'warning', province, 'Province color is missing.')]
        }
        if (!Number.isInteger(province.color) || province.color < 0 || province.color > 0xffffff) {
          return [issue('province.invalid-color', 'warning', province, 'Province color must be a packed RGB value.')]
        }
        return []
      })
    }
  },
  {
    id: 'province/color-unique',
    phase: 'metadata',
    validate(snapshot) {
      return collectDuplicateIssues(snapshot, 'color', 'province.duplicate-color', 'warning', (value) => (
        `Province color ${formatPackedColor(value)} is used more than once.`
      ))
    }
  },
  {
    id: 'province/terrain-valid',
    phase: 'metadata',
    validate(snapshot) {
      return snapshot.catalog.flatMap((province) => {
        if (!province.terrain) {
          return [issue('province.missing-terrain', 'warning', province, 'Province terrain is missing.')]
        }
        if (!snapshot.terrains.has(province.terrain)) {
          return [issue('province.invalid-terrain', 'warning', province, `Province terrain "${province.terrain}" does not exist.`)]
        }
        return []
      })
    }
  },
  {
    id: 'province/color-present-on-map',
    phase: 'full',
    validate(snapshot) {
      return snapshot.catalog.flatMap((province) => {
        if (province.color === null) return []
        if (province.sources.includes('bmp-color')) return []
        if (province.mapPresence === 'missing') {
          return [issue('province.color-missing-on-map', 'warning', province, 'Province color is not present on provinces.bmp.')]
        }
        return []
      })
    }
  },
  {
    id: 'province/bmp-color-without-definition',
    phase: 'full',
    validate(snapshot) {
      return snapshot.catalog.flatMap((province) => {
        if (!province.sources.includes('bmp-color')) return []
        return [issue('province.bmp-color-without-definition', 'error', province, 'Map color exists on provinces.bmp but has no definition entry.')]
      })
    }
  }
]

function collectDuplicateIssues(
  snapshot: ProvinceValidationSnapshot,
  field: 'id' | 'color',
  code: string,
  severity: ProvinceValidationIssue['severity'],
  messageForValue: (value: number) => string
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
    for (const province of provinces) {
      issues.push(issue(code, severity, province, messageForValue(value)))
    }
  }

  return issues
}

function issue(
  code: string,
  severity: ProvinceValidationIssue['severity'],
  province: ProvinceCatalogEntry,
  message: string
): ProvinceValidationIssue {
  return {
    code,
    severity,
    provinceKey: province.key,
    provinceId: province.id,
    message
  }
}

function formatPackedColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0').toUpperCase()}`
}
