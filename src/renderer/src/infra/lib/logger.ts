interface RendererLog {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

// Plain console rather than electron-log/renderer: that package's Vite
// dependency pre-bundling was observed to hang the process entirely on a
// call with an object argument when the module runs outside a real browser
// window (Vitest's Node-based test environment, the standalone harness) —
// gating on `typeof window` didn't help, since importing the pre-bundled
// chunk was itself enough to trigger it. Renderer errors are visible in
// DevTools regardless, which is where they'd be checked anyway; only the
// main process (a stable, unaffected use of electron-log) writes to
// userData/logs/main.log.
export const log: RendererLog = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args)
}

export function installRendererErrorLogging(): void {
  window.addEventListener('error', (event) => {
    log.error('Uncaught error', { message: event.message, filename: event.filename, lineno: event.lineno })
  })
  window.addEventListener('unhandledrejection', (event) => {
    log.error('Unhandled promise rejection', { reason: String(event.reason) })
  })
}
