// Dev-only test harness: serves real MapDataSnapshot/state/region JSON to
// src/renderer/harness.html, computed with the actual main-process loader and
// parsers (no Electron, no worker_threads — parsing runs synchronously here,
// which is fine for a small fixture and lets the harness reuse production
// parsing/loading code untouched). Not part of the app build; run directly
// with `vite-node scripts/harness-server.ts <gamePath> <modPath> [port]`.
import { createServer } from 'http'
import { readFileSync } from 'fs'
import { ProjectLoader } from '../src/main/services/projects/ProjectLoader'
import { parserRegistry, type ParserKey, type ParserInputMap, type ParserOutputMap } from '../src/main/workers/parserRegistry'
import { WeatherTxt } from '../src/main/parsers/WeatherTxt'

class SyncPool {
  dispatch<K extends ParserKey>(filePath: string, key: K, extra?: Omit<ParserInputMap[K], 'content'>): Promise<ParserOutputMap[K][]> {
    const content = readFileSync(filePath, 'utf-8')
    const input = { content, ...(extra ?? {}) } as ParserInputMap[K]
    return Promise.resolve(parserRegistry[key](input))
  }
}

const [, , gamePath, modPath, portArg] = process.argv
if (!gamePath || !modPath) {
  console.error('usage: vite-node scripts/harness-server.ts <gamePath> <modPath> [port]')
  process.exit(1)
}
const port = Number(portArg ?? 4455)

const loader = new ProjectLoader()
const project = loader.open({ gamePath, modPath })
const pool = new SyncPool()

console.log(`[harness] project opened: ${project.projectId}`)
console.log(`[harness] resolvedPaths.provinces = ${project.resolvedPaths.provinces}`)
console.log(`[harness] states files: ${project.resolvedPaths.states.length}, strategicRegions files: ${project.resolvedPaths.strategicRegions.length}`)

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  void (async () => {
    try {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`)
      if (url.pathname === '/api/resolvedPaths') {
        respond(res, { projectId: project.projectId, resolvedPaths: project.resolvedPaths })
        return
      }
      if (url.pathname === '/api/map/load') {
        const snapshot = await loader.loadSnapshot(project, pool as any)
        respond(res, { ...snapshot, projectId: project.projectId, resolvedPaths: project.resolvedPaths })
        return
      }
      if (url.pathname === '/api/map/states') {
        const items = (await Promise.all(
          project.resolvedPaths.states.map((p) => pool.dispatch(p, 'states').then((rs) => rs.map((r) => ({ ...r, sourcePath: p }))))
        )).flat()
        respond(res, items)
        return
      }
      if (url.pathname === '/api/map/strategicRegions') {
        const items = (await Promise.all(
          project.resolvedPaths.strategicRegions.map((p) => pool.dispatch(p, 'strategicRegions').then((rs) => rs.map((r) => ({ ...r, sourcePath: p }))))
        )).flat()
        respond(res, items)
        return
      }
      if (url.pathname === '/api/map/weather') {
        respond(res, WeatherTxt.load(project.resolvedPaths.weather))
        return
      }
      if (url.pathname === '/api/map/resources') {
        const items = (await Promise.all(
          project.resolvedPaths.resources.map((p) => pool.dispatch(p, 'resources'))
        )).flat()
        respond(res, items)
        return
      }
      res.statusCode = 404
      res.end('not found')
    } catch (err) {
      console.error(err)
      res.statusCode = 500
      res.end(err instanceof Error ? (err.stack ?? err.message) : String(err))
    }
  })()
})

function respond(res: import('http').ServerResponse, data: unknown): void {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

server.listen(port, () => {
  console.log(`[harness] listening on http://localhost:${port}`)
})
