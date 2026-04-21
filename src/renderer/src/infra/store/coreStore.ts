import { create } from 'zustand'
import { type AppSlice, createAppSlice } from './slices/appSlice'
import { type SessionSlice, createSessionSlice } from './slices/sessionSlice'
import { type MapUiSlice, createMapUiSlice } from './slices/mapUiSlice'

export type CoreStoreState = AppSlice & SessionSlice & MapUiSlice

export const useCoreStore = create<CoreStoreState>()((...a) => ({
  ...createAppSlice(...a),
  ...createSessionSlice(...a),
  ...createMapUiSlice(...a),
}))
