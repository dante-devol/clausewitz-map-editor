import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const GAME_PATH_FILE = () => join(app.getPath('userData'), 'game-path.json')

export function getGamePath(): string | null {
  try {
    const file = GAME_PATH_FILE()
    if (!existsSync(file)) return null
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return null
  }
}

export function setGamePath(path: string): void {
  writeFileSync(GAME_PATH_FILE(), JSON.stringify(path), 'utf-8')
}
