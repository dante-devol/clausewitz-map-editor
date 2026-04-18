import { readFileSync } from 'fs'
import { resolvePaths } from '../../pathResolver'
import { ContinentTxt } from '../../parsers/ContinentTxt'
import { DefinitionsCsv } from '../../parsers/DefinitionsCsv'
import { TerrainTxt } from '../../parsers/TerrainTxt'
import type { MapDataSnapshot, ProjectOpenRequest, ProjectOpenResult } from '../../../shared/contract/api'
import type { Continent } from '../../../shared/mapDataTypes'

export interface LoadedProject {
  projectId: string
  resolvedPaths: ProjectOpenResult['resolvedPaths']
}

export class ProjectLoader {
  open(request: ProjectOpenRequest): LoadedProject {
    return {
      projectId: crypto.randomUUID(),
      resolvedPaths: resolvePaths(request.gamePath, request.modPath)
    }
  }

  loadSnapshot(project: LoadedProject): MapDataSnapshot {
    const continents = this.loadContinents(project)
    const terrains = new TerrainTxt(project.resolvedPaths.provinceTerrain).load()
    const provinces = new DefinitionsCsv(project.resolvedPaths.definitions).load(continents)
    const provincesImageB64 = readFileSync(project.resolvedPaths.provinces).toString('base64')

    return {
      continents,
      terrains,
      provinces,
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

  loadImageBase64(project: LoadedProject): string {
    return readFileSync(project.resolvedPaths.provinces).toString('base64')
  }
}

