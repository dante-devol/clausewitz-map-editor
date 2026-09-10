import { describe, expect, it } from 'vitest'
import { DefinitionsCsv } from '../DefinitionsCsv'
import type { Continent } from '../../../shared/mapDataTypes'

const CONTINENTS: Continent[] = [
  { codeName: 'europe', position: 1 },
  { codeName: 'asia', position: 2 }
]

const FILE = [
  '0;0;0;0;land;false;unknown;0',
  '1;10;20;30;land;true;plains;1 ',
  '# a comment',
  '2;40;50;60;sea;false;ocean;0',
  '3;70;80;90;lake;false;lakes;2',
  ''
].join('\r\n')

describe('DefinitionsCsv.merge', () => {
  const provinces = DefinitionsCsv.parse(FILE, CONTINENTS)

  it('reproduces the file exactly when nothing changed', () => {
    expect(DefinitionsCsv.merge(FILE, provinces, CONTINENTS)).toBe(FILE)
  })

  it('rewrites only changed rows and appends new ones', () => {
    const edited = provinces.map((p) => (p.id === 2 ? { ...p, terrain: 'deep_ocean' } : p))
    edited.push({ id: 4, color: 0x010203, type: 'land', isCoastal: false, terrain: 'forest', continent: 'asia' })

    const merged = DefinitionsCsv.merge(FILE, edited, CONTINENTS)
    expect(merged).toBe([
      '0;0;0;0;land;false;unknown;0',
      '1;10;20;30;land;true;plains;1 ',
      '# a comment',
      '2;40;50;60;sea;false;deep_ocean;0',
      '3;70;80;90;lake;false;lakes;2',
      '4;1;2;3;land;false;forest;2',
      ''
    ].join('\r\n'))
  })
})
