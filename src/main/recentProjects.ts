import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { log } from './logger'

const RECENT_PROJECTS_PATH = () => join(app.getPath('userData'), 'recent-projects.json')
const MAX_RECENT = 10

export function getRecentProjects(): string[] {
  try {
    const file = RECENT_PROJECTS_PATH()
    if (!existsSync(file)) return []
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch (error) {
    // Previously silent: a corrupt recent-projects.json would just look like
    // an empty recents list, with no trace of why.
    log.warn('Failed to read recent-projects.json, treating as empty', { error: String(error) })
    return []
  }
}

// Prepends path, deduplicates, caps at MAX_RECENT.
export function addRecentProject(path: string): void {
  const updated = [path, ...getRecentProjects().filter((p) => p !== path)].slice(0, MAX_RECENT)
  saveRecentProjects(updated)
}

export function removeRecentProject(path: string): void {
  saveRecentProjects(getRecentProjects().filter((p) => p !== path))
}

function saveRecentProjects(projects: string[]): void {
  writeFileSync(RECENT_PROJECTS_PATH(), JSON.stringify(projects), 'utf-8')
}
