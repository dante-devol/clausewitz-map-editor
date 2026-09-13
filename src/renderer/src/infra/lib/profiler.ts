import { useProfilerStore } from '../store/profilerStore'

// Disabled by default so instrumented hot paths (render calls, worker
// round-trips) cost a single boolean check when the overlay isn't open,
// instead of always paying for a store update.
let enabled = false

export function setProfilerEnabled(next: boolean): void {
  enabled = next
}

export function isProfilerEnabled(): boolean {
  return enabled
}

const pendingStarts = new Map<string, number>()

// For async spans (e.g. a worker request/response) where start and end
// happen in different callbacks. `key` identifies one in-flight span;
// `label` groups its recorded durations in the profiler store.
export function profilerStart(key: string): void {
  if (!enabled) return
  pendingStarts.set(key, performance.now())
}

export function profilerEnd(label: string, key: string): void {
  if (!enabled) return
  const start = pendingStarts.get(key)
  if (start === undefined) return
  pendingStarts.delete(key)
  useProfilerStore.getState().recordSample(label, performance.now() - start)
}

export function profilerTime<T>(label: string, fn: () => T): T {
  if (!enabled) return fn()
  const start = performance.now()
  const result = fn()
  useProfilerStore.getState().recordSample(label, performance.now() - start)
  return result
}
