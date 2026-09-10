import { describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import { ProjectSessionRegistry } from '../ProjectSessionRegistry'

// Only the members ProjectSessionRegistry/ProjectSession actually touch.
function fakeWindow(id: number): BrowserWindow {
  return {
    webContents: { id, send: vi.fn() },
    on: vi.fn()
  } as unknown as BrowserWindow
}

// Bypasses the real worker pool (which spawns OS threads) the way the
// project's own manual test harness does: a session normally only gets a
// pool via open(), so a session that was never opened has none to fake.
function openedSession(registry: ProjectSessionRegistry, window: BrowserWindow) {
  const session = registry.forWindow(window)
  const fakePool = { dispatch: vi.fn(), dispose: vi.fn().mockResolvedValue(undefined) }
  Object.assign(session as any, {
    project: { projectId: 'p1', gamePath: '/game', modPath: '/mod', resolvedPaths: {} },
    pool: fakePool
  })
  return { session, fakePool }
}

describe('ProjectSessionRegistry.closeForWindow', () => {
  it('disposes the session for the given project', () => {
    const registry = new ProjectSessionRegistry()
    const window = fakeWindow(1)
    const { session, fakePool } = openedSession(registry, window)

    registry.closeForWindow(window, 'p1')

    expect(fakePool.dispose).toHaveBeenCalled()
    expect(session.projectId).toBeNull()
    expect(() => session.requireProject()).toThrow('Project not open')
  })

  it('refuses to close a project that is not the one open in that window', () => {
    const registry = new ProjectSessionRegistry()
    const window = fakeWindow(1)
    openedSession(registry, window)

    expect(() => registry.closeForWindow(window, 'someone-elses-project')).toThrow('Project session mismatch')
  })

  it('leaves the session reusable — a later open() works normally', () => {
    const registry = new ProjectSessionRegistry()
    const window = fakeWindow(1)
    const { session } = openedSession(registry, window)

    registry.closeForWindow(window, 'p1')

    expect(() => session.open({ projectId: 'p2', gamePath: '/game', modPath: '/mod', resolvedPaths: {} as any })).not.toThrow()
    expect(session.projectId).toBe('p2')
  })
})
