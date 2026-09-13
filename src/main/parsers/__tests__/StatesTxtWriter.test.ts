import { describe, expect, it } from 'vitest'
import type { StateDefinition } from '../../../shared/mapDataTypes'
import { StatesTxt } from '../StatesTxt'
import { newStateLines, removeStates } from '../StatesTxtWriter'

const TWO_STATE_FILE = `
state = {
	id = 900
	name = "STATE_900"
	manpower = 250000
	state_category = rural
	provinces = { 1001 1002 }
}

state = {
	id = 901
	name = "STATE_901"
	manpower = 100000
	state_category = town
	provinces = { 1003 }
}
`

function emptyState(id: number, provinceIds: number[]): StateDefinition {
  return {
    id,
    name: `New State ${id}`,
    displayName: `New State ${id}`,
    provinceIds,
    manpower: 0,
    stateCategory: '',
    history: { owner: undefined, coreOf: [], buildings: [], victoryPoints: [], effects: [], dateHistory: [] }
  }
}

describe('removeStates', () => {
  it('removes only the matching state block, leaving the rest of the file untouched', () => {
    const result = removeStates(TWO_STATE_FILE, [900])

    expect(result.remainingCount).toBe(1)
    const remaining = StatesTxt.parse(result.content)
    expect(remaining.map((s) => s.id)).toEqual([901])
    expect(result.content).toContain('STATE_901')
    expect(result.content).not.toContain('STATE_900')
  })

  it('removes multiple states in one pass', () => {
    const result = removeStates(TWO_STATE_FILE, [900, 901])

    expect(result.remainingCount).toBe(0)
    expect(StatesTxt.parse(result.content)).toHaveLength(0)
  })

  it('is a no-op when the id is not present', () => {
    const result = removeStates(TWO_STATE_FILE, [999])

    expect(result.content).toBe(TWO_STATE_FILE)
    expect(result.remainingCount).toBe(2)
  })
})

describe('newStateLines', () => {
  it('generates a block that parses back into an equivalent state', () => {
    const state: StateDefinition = {
      ...emptyState(950, [2001, 2002]),
      name: 'STATE_950',
      displayName: 'STATE_950',
      manpower: 50000,
      stateCategory: 'city'
    }

    const content = newStateLines(state).join('\n')
    const [parsed] = StatesTxt.parse(content)

    expect(parsed.id).toBe(950)
    expect(parsed.name).toBe('STATE_950')
    expect(parsed.manpower).toBe(50000)
    expect(parsed.stateCategory).toBe('city')
    expect(parsed.provinceIds).toEqual([2001, 2002])
  })

  it('omits state_category when empty rather than writing an empty string', () => {
    const content = newStateLines(emptyState(1, [10])).join('\n')
    expect(content).not.toContain('state_category')
  })

  it('round-trips through removeStates when appended into an existing file', () => {
    const created = newStateLines(emptyState(902, [1004])).join('\n')
    const combined = `${TWO_STATE_FILE}\n${created}\n`

    expect(StatesTxt.parse(combined).map((s) => s.id).sort()).toEqual([900, 901, 902])

    const result = removeStates(combined, [902])
    expect(StatesTxt.parse(result.content).map((s) => s.id).sort()).toEqual([900, 901])
  })
})
