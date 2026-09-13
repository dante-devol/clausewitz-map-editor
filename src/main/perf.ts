import { log } from './logger'

// Debug-level so routine timings don't spam the (size-capped) log file in
// production — they still show in the dev console. A slow call is escalated
// to warn separately by call sites that care, using the returned duration.
export async function timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  try {
    return await fn()
  } finally {
    log.debug(`[perf] ${label}`, { ms: Math.round(performance.now() - start) })
  }
}

export function timeSync<T>(label: string, fn: () => T): T {
  const start = performance.now()
  try {
    return fn()
  } finally {
    log.debug(`[perf] ${label}`, { ms: Math.round(performance.now() - start) })
  }
}
