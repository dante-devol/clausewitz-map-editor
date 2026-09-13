import { app, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { createWindow } from './window'
import { registerIpcHandlers } from './ipc/registerHandlers'
import { initLogger, log } from './logger'

// Chromium stores cookies, disk/GPU caches, local/session storage, etc. under
// sessionData, which defaults to the same directory as userData — that's what
// litters userData with a dozen internal folders (Cache, GPUCache, Local
// Storage, ...) alongside our own config.json/logs/localisation-cache. Must
// be set before 'ready' fires.
app.setPath('sessionData', join(app.getPath('userData'), 'browser-data'))

initLogger()
registerIpcHandlers()

// Only in production: the app never loads remote content or navigates away
// from its own bundle, so a strict policy costs nothing. Left off in dev so
// Vite's HMR client (which needs eval-like module transforms) keeps working.
// style-src needs 'unsafe-inline' for React's inline `style` prop — Fluent
// UI's own CSS-in-JS (Griffel) inserts rules via CSSOM insertRule(), which
// CSP does not govern, so it works under this policy regardless.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-src 'none'"
].join('; ')

app.whenReady().then(() => {
  if (!is.dev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [CONTENT_SECURITY_POLICY]
        }
      })
    })
  }

  log.info('App ready', { version: app.getVersion() })

  createWindow()
  // macOS: re-create the window when the dock icon is clicked with no windows
  // open. Clicking the dock icon while a window already exists (e.g. it was
  // just minimized) also fires 'activate' — that shouldn't spawn a second one.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  log.info('All windows closed')
  if (process.platform !== 'darwin') app.quit()
})
