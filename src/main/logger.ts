import { app } from 'electron'
import { join } from 'path'
import log from 'electron-log/main'

// Deliberately not `import { is } from '@electron-toolkit/utils'`: that
// package's own import of 'electron' breaks under Vitest's ESM/CJS interop
// (the 'electron' package resolves to a plain path string outside a real
// Electron runtime, so it has no named exports), which would fail every unit
// test that transitively imports this module. `app` alone is already used
// this way throughout src/main and is proven safe under Vitest — but only
// when accessed lazily inside a function, same as config.ts/recentProjects.ts
// do: `app` destructures to `undefined` under Vitest's stubbed 'electron', so
// touching it at module-eval time (top-level, like `!app.isPackaged` would
// be) throws immediately for every test that imports this module.

// electron-log's file transport is active by default from the moment this
// module is imported — and unit tests import it transitively (config.ts,
// ProjectSession.ts, WorkerParsePool.ts, ...) and do call log.error/log.warn
// (e.g. WorkerParsePool.test.ts simulates worker failures). Without this,
// electron-log's own Node-level fallback path resolution (independent of
// Electron's app.getPath, and not guarded by whether initLogger() ran) would
// have every test run writing into the real installed app's userData/logs
// directory. Only initLogger() — called once, by the real app — turns it on.
log.transports.file.level = false

// electron-log's default file location diverges by platform (e.g. macOS uses
// ~/Library/Logs instead of userData). Pinning it under userData keeps logs
// in one predictable place across platforms — this is meant to move to a
// proper log destination (rotation policy, remote sink, etc.) later.
export function initLogger(): void {
  log.transports.file.resolvePathFn = () => join(app.getPath('userData'), 'logs', 'main.log')
  log.transports.file.level = 'info'
  log.transports.console.level = app.isPackaged ? 'info' : 'debug'

  // Wires up main-process handling for uncaught exceptions and unhandled
  // promise rejections so they're recorded instead of silently vanishing.
  log.errorHandler.startCatching()
}

export { log }
