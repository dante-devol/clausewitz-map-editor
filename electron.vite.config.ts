import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          fileParseWorker: resolve('src/main/workers/fileParseWorker.ts'),
        }
      }
    }
  },
  preload: {
    // electron-log's preload entry must be bundled in, not left as a
    // runtime require() — the sandboxed preload context (sandbox: true in
    // window.ts) only allows requiring Electron/Node builtins, not
    // arbitrary node_modules, so an externalized 'electron-log/preload'
    // fails at launch with "module not found".
    plugins: [externalizeDepsPlugin({ exclude: ['electron-log'] })]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
