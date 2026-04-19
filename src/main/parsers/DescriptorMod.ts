import { existsSync, readFileSync } from 'fs'

export interface ModDescriptor {
  replacePaths: string[]
}

export class DescriptorMod {
  static load(filePath: string): ModDescriptor {
    if (!existsSync(filePath)) return { replacePaths: [] }
    return DescriptorMod.parse(readFileSync(filePath, 'utf-8'))
  }

  static parse(content: string): ModDescriptor {
    const replacePaths: string[] = []
    const regex = /^\s*replace_path\s*=\s*"([^"]+)"/gm

    let match: RegExpExecArray | null
    while ((match = regex.exec(content)) !== null) {
      const normalized = normalizeRelativePath(match[1])
      if (normalized) replacePaths.push(normalized)
    }

    return { replacePaths }
  }
}

export function normalizeRelativePath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
}
