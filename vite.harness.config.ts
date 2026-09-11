// Dev-only: serves the renderer through plain Vite (no Electron launch), so
// harness.html can run in an ordinary browser tab. See docs/testing-issue-4.md.
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: resolve('src/renderer'),
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src')
    }
  },
  plugins: [react()],
  server: {
    port: 5173
  }
})
