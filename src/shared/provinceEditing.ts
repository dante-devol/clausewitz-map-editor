import type { Province, ProvinceColor, ProvinceType } from './mapDataTypes'

export interface BmpOnlyEntry {
  guid: string
  color: ProvinceColor
}

export interface ProvinceDraftFields {
  type: ProvinceType | undefined
  isCoastal: boolean | undefined
  terrain: string | undefined
  continent: string | undefined
}

export interface ProvinceDraftTarget extends ProvinceDraftFields {
  provinceId: number | null
  bmpGuid: string | null
  color: ProvinceColor
  source: 'canonical' | 'bmp-only'
  status: 'canonical' | 'replacement' | 'registered' | 'unregistered'
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
  patch: Partial<ProvinceDraftFields>
  original: Province
}

export interface BmpFieldEdit {
  kind: 'bmp-field-edit'
  changeId: string
  bmpGuid: string
  bmpColor: ProvinceColor
  patch: ProvinceDraftFields
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

export type PendingChange = FieldEdit | BmpFieldEdit | BmpReplacement | NewProvince

export interface BmpPixelStrokeDelta {
  offset: number
  oldR: number; oldG: number; oldB: number
  newR: number; newG: number; newB: number
}

export interface BmpPixelStroke {
  id: string
  targetProvinceColor: number
  pixelCount: number
  pixels: BmpPixelStrokeDelta[]
}
