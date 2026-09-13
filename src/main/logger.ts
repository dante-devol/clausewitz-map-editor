import { app } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import log from 'electron-log/main'

// electron-log's default file location diverges by platform (e.g. macOS uses
// ~/Library/Logs instead of userData). Pinning it under userData keeps logs
// in one predictable place across platforms — this is meant to move to a
// proper log destination (rotation policy, remote sink, etc.) later.
export function initLogger(): void {
  log.transports.file.resolvePathFn = () => join(app.getPath('userData'), 'logs', 'main.log')
  log.transports.file.level = 'info'
  log.transports.console.level = is.dev ? 'debug' : 'info'

  // Wires up main-process handling for uncaught exceptions and unhandled
  // promise rejections so they're recorded instead of silently vanishing.
  log.errorHandler.startCatching()

  // Also forwards renderer-process log calls (see preload's
  // 'electron-log/preload' import and the renderer logger) into this same
  // file, tagged with their process type.
  log.initialize()
}

export { log }
