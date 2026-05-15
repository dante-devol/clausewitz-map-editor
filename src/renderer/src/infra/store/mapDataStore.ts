import { create } from 'zustand'
import {
  createProvinceDataSlice,
  PROVINCE_DATA_EMPTY,
  type ProvinceDataSlice
} from './slices/provinceDataSlice'
import {
  createProvinceEditSlice,
  PROVINCE_EDIT_EMPTY,
  type ProvinceEditSlice
} from './slices/provinceEditSlice'
import {
  createSelectionSlice,
  SELECTION_EMPTY,
  type SelectionSlice
} from './slices/selectionSlice'
import {
  createDatasetSlice,
  DATASET_EMPTY,
  type DatasetSlice
} from './slices/datasetSlice'
import {
  createImageSlice,
  IMAGE_EMPTY,
  type ImageSlice
} from './slices/imageSlice'
import {
  createEditorModeSlice,
  EDITOR_MODE_EMPTY,
  type EditorModeSlice
} from './slices/editorModeSlice'
import {
  createStateEditSlice,
  STATE_EDIT_EMPTY,
  type StateEditSlice
} from './slices/stateEditSlice'
import {
  createStrategicRegionEditSlice,
  STRATEGIC_REGION_EDIT_EMPTY,
  type StrategicRegionEditSlice
} from './slices/strategicRegionEditSlice'

export type MapDataState =
  ProvinceDataSlice &
  ProvinceEditSlice &
  SelectionSlice &
  DatasetSlice &
  ImageSlice &
  EditorModeSlice &
  StateEditSlice &
  StrategicRegionEditSlice & {
    clear: () => void
  }

export const useMapDataStore = create<MapDataState>()((...a) => {
  const [set] = a
  return {
    ...createProvinceDataSlice(...a),
    ...createProvinceEditSlice(...a),
    ...createSelectionSlice(...a),
    ...createDatasetSlice(...a),
    ...createImageSlice(...a),
    ...createEditorModeSlice(...a),
    ...createStateEditSlice(...a),
    ...createStrategicRegionEditSlice(...a),
    clear: () => set({
      ...PROVINCE_DATA_EMPTY,
      ...PROVINCE_EDIT_EMPTY,
      ...SELECTION_EMPTY,
      ...DATASET_EMPTY,
      ...IMAGE_EMPTY,
      ...EDITOR_MODE_EMPTY,
      ...STATE_EDIT_EMPTY,
      ...STRATEGIC_REGION_EDIT_EMPTY,
    }),
  }
})
