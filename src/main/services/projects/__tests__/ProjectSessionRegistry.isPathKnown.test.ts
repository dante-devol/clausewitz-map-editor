import { describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import { ProjectSessionRegistry } from '../ProjectSessionRegistry'

function fakeWindow(id: number): BrowserWindow {
  return { webContents: { id, send: vi.fn() }, on: vi.fn() } as unknown as BrowserWindow
}

function openedSession(registry: ProjectSessionRegistry, window: BrowserWindow) {
  const session = registry.forWindow(window)
  Object.assign(session as any, {
    project: {
      projectId: 'p1',
      gamePath: '/game',
      modPath: '/mod',
      resolvedPaths: {
        descriptor: '/mod/descriptor.mod',
        defaultMap: '/mod/map/default.map',
        definitions: '/mod/map/definition.csv',
        provinces: '/mod/map/provinces.bmp',
        continent: '/mod/map/continent.txt',
        provinceTerrain: ['/game/common/terrain/00_terrain.txt'],
        states: ['/mod/history/states/1-A.txt', '/game/history/states/2-B.txt'],
        strategicRegions: ['/mod/map/strategicregions/1-A.txt'],
        rivers: '/mod/map/rivers.bmp',
        stateCategories: ['/game/common/state_category/00_categories.txt'],
        resources: ['/game/common/resources/00_resources.txt'],
        buildings: ['/game/common/buildings/00_buildings.txt'],
        weather: '/game/common/weather.txt'
      }
    }
  })
  return session
}

describe('ProjectSessionRegistry.isPathKnownForWindow', () => {
  it('accepts single-file path values', () => {
    const registry = new ProjectSessionRegistry()
    const window = fakeWindow(1)
    openedSession(registry, window)

    expect(registry.isPathKnownForWindow(window, '/mod/map/definition.csv')).toBe(true)
    expect(registry.isPathKnownForWindow(window, '/mod/map/rivers.bmp')).toBe(true)
  })

  it('accepts entries inside array-valued (folder) paths, from either the mod or the game', () => {
    const registry = new ProjectSessionRegistry()
    const window = fakeWindow(1)
    openedSession(registry, window)

    expect(registry.isPathKnownForWindow(window, '/mod/history/states/1-A.txt')).toBe(true)
    expect(registry.isPathKnownForWindow(window, '/game/history/states/2-B.txt')).toBe(true)
  })

  it('refuses a path that is not part of the open project', () => {
    const registry = new ProjectSessionRegistry()
    const window = fakeWindow(1)
    openedSession(registry, window)

    expect(registry.isPathKnownForWindow(window, '/etc/passwd')).toBe(false)
    expect(registry.isPathKnownForWindow(window, '/mod/history/states/3-C.txt')).toBe(false)
  })

  it('refuses everything when no project is open in that window', () => {
    const registry = new ProjectSessionRegistry()
    const window = fakeWindow(1)

    expect(registry.isPathKnownForWindow(window, '/mod/map/definition.csv')).toBe(false)
  })
})
