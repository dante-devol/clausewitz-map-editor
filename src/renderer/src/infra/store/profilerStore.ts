import { create } from 'zustand'

const MAX_SAMPLES_PER_LABEL = 120

export interface ProfilerSample {
  duration: number
  timestamp: number
}

interface ProfilerState {
  samplesByLabel: Map<string, ProfilerSample[]>
  recordSample: (label: string, duration: number) => void
  clear: () => void
}

export const useProfilerStore = create<ProfilerState>((set) => ({
  samplesByLabel: new Map(),
  recordSample: (label, duration) => set((state) => {
    const next = new Map(state.samplesByLabel)
    const existing = next.get(label) ?? []
    next.set(label, [...existing, { duration, timestamp: performance.now() }].slice(-MAX_SAMPLES_PER_LABEL))
    return { samplesByLabel: next }
  }),
  clear: () => set({ samplesByLabel: new Map() })
}))
