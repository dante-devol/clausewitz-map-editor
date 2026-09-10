import { describe, expect, it } from 'vitest'
import type { BrowserWindow } from 'electron'
import type { ProjectLoader } from '../ProjectLoader'
import { ProjectSession } from '../ProjectSession'

// Only the members ProjectSession actually touches.
function fakeWindow(): { window: BrowserWindow; sent: any[] } {
  const sent: any[] = []
  const window = { webContents: { send: (_channel: string, event: any) => sent.push(event) } } as unknown as BrowserWindow
  return { window, sent }
}

function project(id: string) {
  return {
    projectId: id,
    gamePath: '/game',
    modPath: '/mod',
    resolvedPaths: {
      descriptor: '', defaultMap: '', definitions: '', provinces: '', continent: '',
      provinceTerrain: [], states: [`state-${id}.txt`], strategicRegions: [`region-${id}.txt`],
      rivers: '', stateCategories: [], resources: [], buildings: [], weather: ''
    }
  } as any
}

describe('ProjectSession — stale async results after a project switch', () => {
  it("a states chunk arriving after switching projects is not emitted under the new project's id, and does not mark it loaded", async () => {
    const { window, sent } = fakeWindow()
    let deliverChunk: (() => void) | null = null
    let firstCallMade = false
    let secondLoadStarted = false
    const loader = {
      loadStatesProgressive: (_project: unknown, _pool: unknown, onChunk: (items: unknown[], loaded: number, total: number) => void) => {
        if (!firstCallMade) {
          // First call, for project A: hang until the test delivers the chunk.
          firstCallMade = true
          return new Promise<void>((resolve) => {
            deliverChunk = () => { onChunk([{ id: 1 }], 1, 1); resolve() }
          })
        }
        secondLoadStarted = true
        return new Promise<void>(() => {}) // never resolves; the test only checks it was called
      }
    } as unknown as ProjectLoader

    const session = new ProjectSession(window, loader)
    const projectA = project('A')
    Object.assign(session as any, { project: projectA, pool: {} })

    const loadPromise = session.loadStates()

    // Switch to project B mid-flight, the way opening a new project would —
    // open() resets these same fields.
    const projectB = project('B')
    Object.assign(session as any, {
      project: projectB, pool: {}, statesLoaded: false, statesLoadPromise: null
    })

    deliverChunk!()
    await loadPromise.catch(() => {})

    // The 'replace' event from starting project A's load is expected; the
    // stale chunk must not have been forwarded under project B's id (or at all).
    const stateEvents = sent.filter((e) => e.type === 'states')
    expect(stateEvents).toHaveLength(1)
    expect(stateEvents[0]).toMatchObject({ projectId: 'A', data: { op: 'replace' } })

    // Project B must still appear unloaded — its own loadStates() call does
    // real work rather than short-circuiting as if the stale chunk had loaded it.
    void session.loadStates()
    expect(secondLoadStarted).toBe(true)
  })

  it('loadSnapshot does not write session state for a project that has since closed', async () => {
    const { window } = fakeWindow()
    let resolveSnapshot: ((value: any) => void) | null = null
    const loader = {
      loadSnapshot: () => new Promise((resolve) => { resolveSnapshot = resolve })
    } as unknown as ProjectLoader

    const session = new ProjectSession(window, loader)
    const projectA = project('A')
    Object.assign(session as any, { project: projectA, pool: {} })

    const snapshotPromise = session.loadSnapshot()
    // The user leaves the project entirely (Back) before the load finishes.
    Object.assign(session as any, { project: null, pool: null })

    resolveSnapshot!({
      continents: [{ codeName: 'europe', position: 1 }],
      definitionsHash: 'stale-hash',
      provincesImageHash: 'stale-image-hash'
    })
    await snapshotPromise

    expect(session.projectId).toBeNull()
    expect(() => session.requireProject()).toThrow('Project not open')
  })
})
