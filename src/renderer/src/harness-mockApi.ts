// Dev-only stand-in for the Electron preload's `window.api`, backed by
// scripts/harness-server.ts (which loads real fixture data through the actual
// main-process ProjectLoader/parsers). Lets the renderer run in a plain
// browser tab against real HOI4-shaped data, so it can be driven and screenshotted
// with ordinary browser tooling instead of an Electron window.
import type {
  ApiContract,
  MapChangedEvent,
  MapDataSnapshot,
  StateDatasetUpdate,
  StrategicRegionDatasetUpdate
} from '../../shared/contract/api'
import type { AppConfig } from '../../shared/contract/api'

const HARNESS_PORT = new URLSearchParams(window.location.search).get('port') ?? '4455'
const BASE = `http://localhost:${HARNESS_PORT}`

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`harness server ${path} -> ${res.status}`)
  return res.json() as Promise<T>
}

async function getBytes(path: string): Promise<Uint8Array> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`harness server ${path} -> ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

// provincesImage travels as raw bytes over real Electron IPC (no JSON
// involved), so the harness mirrors that instead of JSON-encoding it: the
// snapshot JSON omits it (see harness-server.ts) and it's fetched separately
// as octet-stream, then stitched back onto the snapshot here.
async function loadMapSnapshot(projectId: string): Promise<MapDataSnapshot> {
  const [snapshot, provincesImage] = await Promise.all([
    getJson<Omit<MapDataSnapshot, 'provincesImage'>>(`/api/map/load?projectId=${projectId}`),
    getBytes('/api/map/provincesImage')
  ])
  return { ...snapshot, provincesImage }
}

const DEFAULT_CONFIG: AppConfig = {
  locale: null,
  paths: {
    descriptor: '/descriptor.mod',
    defaultMap: '/map/default.map',
    definitions: '/map/definition.csv',
    provinces: '/map/provinces.bmp',
    continent: '/map/continent.txt',
    provinceTerrain: '/common/terrain',
    states: '/history/states',
    strategicRegions: '/map/strategicregions',
    rivers: '/map/rivers.bmp',
    stateCategories: '/common/state_category',
    resources: '/common/resources',
    buildings: '/common/buildings',
    weather: '/common/weather.txt',
    localisation: '/localisation/english',
    adjacencies: '/map/adjacencies.csv',
    supplyNodes: '/map/supply_nodes.txt',
    railways: '/map/railways.txt'
  },
  displayModeOverrides: {},
  neighborRevealRingDepth: 1
}

let config: AppConfig = { ...DEFAULT_CONFIG }
const changedListeners = new Set<(event: MapChangedEvent) => void>()

export function createMockApi(): ApiContract {
  return {
    app: {
      getSystemLocale: async () => 'en',
      openUserDataFolder: async () => { console.log('[harness] openUserDataFolder called (no-op)') }
    },
    dialogs: {
      openFolder: async () => null,
      confirm: async () => true // auto-confirm any discard-changes prompt
    },
    files: {
      load: async (path) => ({ path, hash: '', content: '' }),
      unload: async () => {},
      onChanged: () => () => {}
    },
    projects: {
      getRecent: async () => [],
      addRecent: async () => {},
      removeRecent: async () => {},
      verifyModPath: async () => ({ hasAny: true, foundPaths: [], missingPaths: [] }),
      open: async () => {
        throw new Error('harness bypasses projects.open — project is seeded directly at boot')
      },
      close: async () => {}
    },
    game: {
      getPath: async () => null,
      setPath: async () => {},
      verifyPath: async () => ({ valid: true, missingPaths: [] })
    },
    map: {
      load: async (projectId) => loadMapSnapshot(projectId),
      save: async () => ({ hash: '' }),
      saveStates: async () => {},
      saveStrategicRegions: async () => {},
      loadStates: async (projectId) => {
        const items = await getJson<StateDatasetUpdate['items']>('/api/map/states')
        emit({
          projectId,
          type: 'states',
          data: { op: 'replace', items, loadedFiles: items.length, totalFiles: items.length } satisfies StateDatasetUpdate
        })
      },
      loadStrategicRegions: async (projectId) => {
        const items = await getJson<StrategicRegionDatasetUpdate['items']>('/api/map/strategicRegions')
        emit({
          projectId,
          type: 'strategicRegions',
          data: { op: 'replace', items, loadedFiles: items.length, totalFiles: items.length } satisfies StrategicRegionDatasetUpdate
        })
      },
      loadWeatherEntries: async () => getJson('/api/map/weather'),
      loadResources: async () => getJson('/api/map/resources'),
      loadAdjacencies: async () => getJson('/api/map/adjacencies'),
      loadSupplyNodes: async () => getJson('/api/map/supplyNodes'),
      loadRailways: async () => getJson('/api/map/railways'),
      onChanged: (callback) => {
        changedListeners.add(callback)
        return () => changedListeners.delete(callback)
      },
      saveBmp: async (_projectId, rgbaData, width, height) => {
        console.log(`[harness] saveBmp called: ${width}x${height}, ${rgbaData.byteLength} bytes (no-op, not persisted)`)
      }
    },
    settings: {
      get: async () => config,
      getValue: async (key) => config[key],
      set: async (key, value) => { config = { ...config, [key]: value } },
      reset: async () => { config = { ...DEFAULT_CONFIG } }
    },
    window: {
      enterEditor: async () => {},
      exitEditor: async () => {},
      confirmClose: async () => {},
      onBeforeClose: () => () => {}
    }
  }
}

function emit(event: MapChangedEvent): void {
  for (const listener of changedListeners) listener(event)
}
