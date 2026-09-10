import { describe, expect, it } from 'vitest'
import { join, resolve } from 'path'
import { isSameOrInside, resolveWriteTarget } from '../writeTargets'

const game = resolve('/games/hoi4')
const mod = resolve('/mods/my_mod')
const roots = { gamePath: game, modPath: mod }

describe('resolveWriteTarget', () => {
  it('writes mod files in place', () => {
    const file = join(mod, 'history', 'states', '1-A.txt')
    expect(resolveWriteTarget(roots, file)).toBe(file)
  })

  it('redirects game files to the same relative path in the mod', () => {
    const file = join(game, 'history', 'states', '1-A.txt')
    expect(resolveWriteTarget(roots, file)).toBe(join(mod, 'history', 'states', '1-A.txt'))
  })

  it('refuses paths outside both roots', () => {
    expect(() => resolveWriteTarget(roots, resolve('/elsewhere/file.txt'))).toThrow(/outside the mod folder/)
    expect(() => resolveWriteTarget(roots, join(game, '..', 'other', 'file.txt'))).toThrow()
  })

  it('does not treat a sibling folder with a shared prefix as inside the game', () => {
    expect(() => resolveWriteTarget(roots, resolve('/games/hoi4-backup/map/definition.csv'))).toThrow()
  })
})

describe('isSameOrInside', () => {
  it('detects the same folder and sub-folders', () => {
    expect(isSameOrInside(game, game)).toBe(true)
    expect(isSameOrInside(game, join(game, 'mod', 'x'))).toBe(true)
    expect(isSameOrInside(game, mod)).toBe(false)
    expect(isSameOrInside(game, resolve('/games/hoi4-backup'))).toBe(false)
  })
})
