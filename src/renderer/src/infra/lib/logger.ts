import log from 'electron-log/renderer'

// Forwards to the main process via the bridge preload/index.ts sets up with
// 'electron-log/preload', landing in the same userData/logs/main.log file as
// main-process log calls. Falls back to plain console output when no such
// bridge exists (e.g. under vitest, or the standalone harness).
export { log }

export function installRendererErrorLogging(): void {
  log.errorHandler.startCatching()
}
