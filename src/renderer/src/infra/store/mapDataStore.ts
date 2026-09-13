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
import {
  createBmpEditSlice,
  BMP_EDIT_EMPTY,
  type BmpEditSlice
} from './slices/bmpEditSlice'
import {
  createLocalisationSlice,
  LOCALISATION_EMPTY,
  type LocalisationSlice
} from './slices/localisationSlice'
import {
  createMapFeaturesSlice,
  MAP_FEATURES_EMPTY,
  type MapFeaturesSlice
} from './slices/mapFeaturesSlice'

export type MapDataState =
  ProvinceDataSlice &
  ProvinceEditSlice &
  SelectionSlice &
  DatasetSlice &
  ImageSlice &
  EditorModeSlice &
  StateEditSlice &
  StrategicRegionEditSlice &
  BmpEditSlice &
  LocalisationSlice &
  MapFeaturesSlice & {
    clear: () => void
  }

// True if saving would write anything: pending province, state, region or
// paint edits. Used to warn before leaving a project or closing the window.
export function selectHasUnsavedChanges(state: MapDataState): boolean {
  return state.pendingEdits.size > 0
    || state.pendingBmpOnlyEdits.size > 0
    || state.bmpReplacements.size > 0
    || state.pendingNewProvinces.size > 0
    || state.pendingStateEdits.size > 0
    || state.pendingStrategicRegionEdits.size > 0
    || state.pendingBmpStrokes.length > 0
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
    ...createBmpEditSlice(...a),
    ...createLocalisationSlice(...a),
    ...createMapFeaturesSlice(...a),
    clear: () => set({
      ...PROVINCE_DATA_EMPTY,
      ...PROVINCE_EDIT_EMPTY,
      ...SELECTION_EMPTY,
      ...DATASET_EMPTY,
      ...IMAGE_EMPTY,
      ...EDITOR_MODE_EMPTY,
      ...STATE_EDIT_EMPTY,
      ...STRATEGIC_REGION_EDIT_EMPTY,
      ...BMP_EDIT_EMPTY,
      ...LOCALISATION_EMPTY,
      ...MAP_FEATURES_EMPTY,
    }),
  }
})
