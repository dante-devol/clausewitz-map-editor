import { create } from 'zustand'
import type { AppConfig } from '../../../shared/contract/api'

export type DisplayModeOverrides = AppConfig['displayModeOverrides']
type ConfigurableDisplayModeKey = 'type' | 'terrain' | 'coastal' | 'continent'

interface DisplayModeConfigState {
  overrides: DisplayModeOverrides
  isLoaded: boolean
  loadOverrides: (overrides: DisplayModeOverrides) => void
  setOverride: (mode: ConfigurableDisplayModeKey, valueKey: string, color: string) => Promise<void>
  resetOverride: (mode: ConfigurableDisplayModeKey, valueKey: string) => Promise<void>
  resetModeOverrides: (mode: ConfigurableDisplayModeKey) => Promise<void>
}

function normalizeHex(value: string): string {
  const normalized = value.trim().replace(/^#/, '').toLowerCase()
  return `#${normalized}`
}

async function persist(overrides: DisplayModeOverrides): Promise<void> {
  await window.api.settings.set('displayModeOverrides', overrides)
}

export const useDisplayModeConfigStore = create<DisplayModeConfigState>((set, get) => ({
  overrides: {},
  isLoaded: false,

  loadOverrides: (overrides) => set({ overrides, isLoaded: true }),

  setOverride: async (mode, valueKey, color) => {
    const normalized = normalizeHex(color)
    const next = {
      ...get().overrides,
      [mode]: {
        ...(get().overrides[mode] ?? {}),
        [valueKey]: normalized
      }
    }
    set({ overrides: next })
    await persist(next)
  },

  resetOverride: async (mode, valueKey) => {
    const modeOverrides = { ...(get().overrides[mode] ?? {}) }
    delete modeOverrides[valueKey]

    const next = { ...get().overrides }
    if (Object.keys(modeOverrides).length === 0) delete next[mode]
    else next[mode] = modeOverrides

    set({ overrides: next })
    await persist(next)
  },

  resetModeOverrides: async (mode) => {
    const next = { ...get().overrides }
    delete next[mode]
    set({ overrides: next })
    await persist(next)
  }
}))
