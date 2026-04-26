import { readFileSync } from 'fs'
import { readFile } from 'fs/promises'
import { computeHash } from '../../fileManager'
import { join } from 'path'
import { getConfig } from '../../config'
import { resolvePaths } from '../../pathResolver'
import { ContinentTxt } from '../../parsers/ContinentTxt'
import { DescriptorMod } from '../../parsers/DescriptorMod'
import { DefinitionsCsv } from '../../parsers/DefinitionsCsv'
import { StrategicRegionsTxt } from '../../parsers/StrategicRegionsTxt'
import { StatesTxt } from '../../parsers/StatesTxt'
import { TerrainTxt } from '../../parsers/TerrainTxt'
import type { MapDataSnapshot, ProjectOpenRequest, ProjectOpenResult } from '../../../shared/contract/api'
import type { Continent } from '../../../shared/mapDataTypes'
import { buildProvinceCatalog } from '../../../shared/provinceCatalog'
import type { WorkerParsePool } from '../../workers/WorkerParsePool'
import type { ParserOutputMap } from '../../workers/parserRegistry'

export interface LoadedProject {
  projectId: string
  resolvedPaths: ProjectOpenResult['resolvedPaths']
}

export class ProjectLoader {
  open(request: ProjectOpenRequest): LoadedProject {
    const descriptorPath = join(request.modPath, getConfig().paths.descriptor)
    const descriptor = DescriptorMod.load(descriptorPath)

    return {
      projectId: crypto.randomUUID(),
      resolvedPaths: resolvePaths(request.gamePath, request.modPath, descriptor.replacePaths)
    }
  }

  async loadSnapshot(project: LoadedProject, pool: WorkerParsePool): Promise<MapDataSnapshot> {
    // Start BMP read and terrain dispatches immediately — no dependencies.
    const provincesBufferPromise = readFile(project.resolvedPaths.provinces)
    const terrainPromise = Promise.all(
      project.resolvedPaths.provinceTerrain.map((p) => pool.dispatch(p, 'terrain'))
    ).then((results) => results.flat())

    // Continent must be parsed before definitions can be dispatched.
    const continentContent = await readFile(project.resolvedPaths.continent, 'utf-8')
    const continents = ContinentTxt.parse(continentContent)
    const definitionsPromise = pool.dispatch(
      project.resolvedPaths.definitions,
      'definitions',
      { continents }
    )

    const [provincesBuffer, terrains, provinces] = await Promise.all([
      provincesBufferPromise,
      terrainPromise,
      definitionsPromise,
    ])

    const provinceCatalog = buildProvinceCatalog(provinces)
    const provincesImageHash = computeHash(provincesBuffer)
    const provincesImageB64 = provincesBuffer.toString('base64')

    return {
      continents,
      terrains,
      provinces,
      provinceCatalog,
      provincesImageB64,
      provincesImageHash,
    }
  }

  loadContinents(project: LoadedProject): Continent[] {
    return new ContinentTxt(project.resolvedPaths.continent).load()
  }

  loadDefinitions(project: LoadedProject, continents: Continent[]) {
    return new DefinitionsCsv(project.resolvedPaths.definitions).load(continents)
  }

  loadTerrain(project: LoadedProject) {
    return new TerrainTxt(project.resolvedPaths.provinceTerrain).load()
  }

  async loadStatesProgressive(
    project: LoadedProject,
    pool: WorkerParsePool,
    onChunk: (
      items: ParserOutputMap['states'][],
      loadedFiles: number,
      totalFiles: number
    ) => void
  ): Promise<void> {
    await loadFilesProgressively(project.resolvedPaths.states, 'states', pool, onChunk)
  }

  async loadStrategicRegionsProgressive(
    project: LoadedProject,
    pool: WorkerParsePool,
    onChunk: (
      items: ParserOutputMap['strategicRegions'][],
      loadedFiles: number,
      totalFiles: number
    ) => void
  ): Promise<void> {
    await loadFilesProgressively(
      project.resolvedPaths.strategicRegions,
      'strategicRegions',
      pool,
      onChunk
    )
  }

  loadImageBase64(project: LoadedProject): { b64: string; hash: string } {
    const buffer = readFileSync(project.resolvedPaths.provinces)
    return { b64: buffer.toString('base64'), hash: computeHash(buffer) }
  }
}

async function loadFilesProgressively<K extends 'states' | 'strategicRegions'>(
  filePaths: string[],
  key: K,
  pool: WorkerParsePool,
  onChunk: (items: ParserOutputMap[K][], loadedFiles: number, totalFiles: number) => void
): Promise<void> {
  const totalFiles = filePaths.length
  if (totalFiles === 0) return

  let loadedFiles = 0
  await Promise.all(
    filePaths.map(async (filePath) => {
      const items = await pool.dispatch(filePath, key)
      loadedFiles++
      onChunk(items as ParserOutputMap[K][], loadedFiles, totalFiles)
    })
  )
}
