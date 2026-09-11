import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import type { BrowserWindow } from 'electron'
import { ProjectSession } from '../ProjectSession'
import { ProjectLoader } from '../ProjectLoader'

function fakeWindow(): { window: BrowserWindow; sent: any[] } {
  const sent: any[] = []
  const window = { webContents: { send: (_channel: string, event: any) => sent.push(event) } } as unknown as BrowserWindow
  return { window, sent }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// watchCoreProjectFiles always watches continent/definitions/provinces too;
// fs.watch() throws on a path that doesn't exist, so these need real files.
function touchDummyFiles(root: string): [continent: string, definitions: string, provinces: string] {
  const paths: [string, string, string] = [join(root, 'continent.txt'), join(root, 'definition.csv'), join(root, 'provinces.bmp')]
  for (const path of paths) writeFileSync(path, '')
  return paths
}

let root: string | null = null

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = null
})

// stateCategories and buildings change events are declared in MapChangedEvent
// but, before this fix, were never actually sent — editing either file on
// disk did nothing until the whole project was reopened.
describe('ProjectSession watches stateCategories and buildings', () => {
  it('emits stateCategories when a state_category file changes on disk', async () => {
    root = mkdtempSync(join(tmpdir(), 'hoi4-watch-'))
    const dir = join(root, 'state_category')
    mkdirSync(dir, { recursive: true })
    const file = join(dir, '00_categories.txt')
    writeFileSync(file, 'state_categories = {\n\ttown = {\n\t\tlocal_building_slots = 4\n\t\tcolor = { 1 2 3 }\n\t}\n}\n')

    const { window, sent } = fakeWindow()
    const session = new ProjectSession(window, new ProjectLoader())
    // watchCoreProjectFiles also watches continent/definitions/provinces
    // unconditionally, so those need to be real (if unrelated) files too.
    const [continentFile, definitionsFile, provincesFile] = touchDummyFiles(root)
    const project = {
      projectId: 'p1', gamePath: root, modPath: root,
      resolvedPaths: {
        descriptor: '', defaultMap: '', definitions: definitionsFile, provinces: provincesFile, continent: continentFile,
        provinceTerrain: [], states: [], strategicRegions: [], rivers: '',
        stateCategories: [file], resources: [], buildings: [], weather: ''
      }
    }
    Object.assign(session as any, { project })
    ;(session as any).watchCoreProjectFiles()

    writeFileSync(file, 'state_categories = {\n\tcity = {\n\t\tlocal_building_slots = 8\n\t\tcolor = { 4 5 6 }\n\t}\n}\n')
    await sleep(400)

    const event = sent.find((e) => e.type === 'stateCategories')
    expect(event).toBeDefined()
    expect(event.data).toEqual([{ codeName: 'city', localBuildingSlots: 8, color: (4 << 16) | (5 << 8) | 6 }])

    session.dispose()
  })

  it('emits buildings when a buildings file changes on disk', async () => {
    root = mkdtempSync(join(tmpdir(), 'hoi4-watch-'))
    const dir = join(root, 'buildings')
    mkdirSync(dir, { recursive: true })
    const file = join(dir, '00_buildings.txt')
    writeFileSync(file, 'buildings = {\n\tinfrastructure = {\n\t\tlevel_cap = {\n\t\t\tstate_max = 5\n\t\t}\n\t}\n}\n')

    const { window, sent } = fakeWindow()
    const session = new ProjectSession(window, new ProjectLoader())
    const [continentFile, definitionsFile, provincesFile] = touchDummyFiles(root)
    const project = {
      projectId: 'p1', gamePath: root, modPath: root,
      resolvedPaths: {
        descriptor: '', defaultMap: '', definitions: definitionsFile, provinces: provincesFile, continent: continentFile,
        provinceTerrain: [], states: [], strategicRegions: [], rivers: '',
        stateCategories: [], resources: [], buildings: [file], weather: ''
      }
    }
    Object.assign(session as any, { project })
    ;(session as any).watchCoreProjectFiles()

    writeFileSync(file, 'buildings = {\n\tbunker = {\n\t\tlevel_cap = {\n\t\t\tstate_max = 10\n\t\t}\n\t}\n}\n')
    await sleep(400)

    const event = sent.find((e) => e.type === 'buildings')
    expect(event).toBeDefined()
    expect(event.data).toEqual([{ codeName: 'bunker', levelCap: { sharesSlots: false, stateMax: 10 } }])

    session.dispose()
  })
})
