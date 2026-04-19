import type { Province, ProvinceColor } from './mapDataTypes'

export interface BmpOnlyEntry {
  guid: string
  color: ProvinceColor
}

export type ReassignmentAction =
  | { type: 'replace'; targetId: number }
  | { type: 'register'; assignedId: number }

export interface FieldEdit {
  kind: 'field-edit'
  changeId: string
  provinceId: number
  patch: Partial<Province>
  original: Province
}

export interface Reassignment {
  kind: 'reassignment'
  changeId: string
  guid: string
  bmpColor: ProvinceColor
  action: ReassignmentAction
}

export type PendingChange = FieldEdit | Reassignment

export type SelectionOrigin =
  | { list: 'canonical'; provinceId: number }
  | { list: 'bmp'; guid: string }
  | { list: 'changes'; changeId: string }
