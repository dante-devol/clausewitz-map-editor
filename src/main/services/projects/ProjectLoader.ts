import { readFileSync } from 'fs'
import { readFile } from 'fs/promises'
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

  loadSnapshot(project: LoadedProject): MapDataSnapshot {
    const continents = this.loadContinents(project)
    const terrains = new TerrainTxt(project.resolvedPaths.provinceTerrain).load()
    const provinces = this.loadDefinitions(project, continents)
    const provinceCatalog = buildProvinceCatalog(provinces)
    const provincesImageB64 = readFileSync(project.resolvedPaths.provinces).toString('base64')

    return {
      continents,
      terrains,
      provinces,
      provinceCatalog,
      provincesImageB64
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
    onChunk: (
      items: import('../../../shared/mapDataTypes').StateDefinition[],
      loadedFiles: number,
      totalFiles: number
    ) => void
  ): Promise<void> {
    await loadFilesProgressively(project.resolvedPaths.states, StatesTxt.parse, onChunk)
  }

  async loadStrategicRegionsProgressive(
    project: LoadedProject,
    onChunk: (
      items: import('../../../shared/mapDataTypes').StrategicRegionDefinition[],
      loadedFiles: number,
      totalFiles: number
    ) => void
  ): Promise<void> {
    await loadFilesProgressively(project.resolvedPaths.strategicRegions, StrategicRegionsTxt.parse, onChunk)
  }

  loadImageBase64(project: LoadedProject): string {
    return readFileSync(project.resolvedPaths.provinces).toString('base64')
  }
}

const FILE_READ_CONCURRENCY = 8

async function loadFilesProgressively<T>(
  filePaths: string[],
  parse: (content: string) => T[],
  onChunk: (items: T[], loadedFiles: number, totalFiles: number) => void
): Promise<void> {
  const totalFiles = filePaths.length
  let nextIndex = 0
  let loadedFiles = 0

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex
      if (index >= filePaths.length) return
      nextIndex += 1

      const items = parse(await readFile(filePaths[index], 'utf-8'))
      loadedFiles += 1
      onChunk(items, loadedFiles, totalFiles)
    }
  }

  const workerCount = Math.min(FILE_READ_CONCURRENCY, filePaths.length)
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()))
}
