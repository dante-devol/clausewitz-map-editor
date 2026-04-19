import type { Province, ProvinceColor } from './mapDataTypes'

export interface BmpOnlyEntry {
  guid: string
  color: ProvinceColor
}

// Used by the assignBmpProvince store action
export type BmpAssignmentAction =
  | { type: 'replace'; targetId: number }
  | { type: 'register'; assignedId: number }

// Guid-keyed view of assignments, derived in ProvincePanel for BmpOnlyList display
export type BmpAssignment =
  | { kind: 'replace'; targetId: number }
  | { kind: 'register'; assignedId: number }

export interface FieldEdit {
  kind: 'field-edit'
  changeId: string
  provinceId: number
  patch: Partial<Province>
  original: Province
}

// A canonical province whose map color is being replaced by a BMP-only entry
export interface BmpReplacement {
  kind: 'bmp-replacement'
  changeId: string
  provinceId: number
  bmpGuid: string
  bmpColor: ProvinceColor
  original: Province
}

// A BMP-only entry being registered as a brand-new province
export interface NewProvince {
  kind: 'new-province'
  changeId: string
  bmpGuid: string
  bmpColor: ProvinceColor
  assignedId: number
}

export type PendingChange = FieldEdit | BmpReplacement | NewProvince

export type SelectionOrigin =
  | { list: 'canonical'; provinceId: number }
  | { list: 'bmp'; guid: string }
  | { list: 'changes'; changeId: string }
