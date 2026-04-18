import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const RECENT_PROJECTS_PATH = () => join(app.getPath('userData'), 'recent-projects.json')
const MAX_RECENT = 10

export function getRecentProjects(): string[] {
  try {
    const file = RECENT_PROJECTS_PATH()
    if (!existsSync(file)) return []
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
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
