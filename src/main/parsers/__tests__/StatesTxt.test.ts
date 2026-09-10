import { describe, expect, it } from 'vitest'
import type { StateDefinition } from '../../../shared/mapDataTypes'
import { StatesTxt } from '../StatesTxt'
import { applyStateSaves } from '../StatesTxtWriter'

// Synthetic fixture exercising the constructs the old parser and writer broke:
// conditional blocks in dated history, `impassable`, commented-out entries,
// comments inside blocks and irregular formatting.
const STATE_FILE = `
state={
	id=900
	name="STATE_900" # display name comes from localisation
	manpower = 250000
	state_category = rural
	impassable = yes

	resources={
		oil=4 # was 6
		# steel=2
	}

	history={
		owner = AAA
		add_core_of = AAA
		victory_points = {
			1001 5 #Capital
		}
		buildings = {
			infrastructure = 2
			1001 = {
				naval_base = 1
			}
		}
		set_demilitarized_zone = no

		1939.1.1 = {
			IF = {
				limit = { has_dlc = "Some Expansion" }
				BBB = { transfer_state = PREV }
				add_core_of = BBB
			}
		}
	}

	provinces={
		1001 1002 1003
	}
	local_supplies = 0.0
}
`

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function parseOne(content: string): StateDefinition {
  return StatesTxt.parse(content)[0]
}

describe('StatesTxt.parse', () => {
  const state = parseOne(STATE_FILE)

  it('reads top-level fields', () => {
    expect(state).toMatchObject({
      id: 900,
      name: 'STATE_900',
      manpower: 250000,
      stateCategory: 'rural',
      isImpassable: true,
      localSupplies: 0,
      provinceIds: [1001, 1002, 1003]
    })
  })

  it('ignores commented-out entries', () => {
    expect(state.resources).toEqual([{ type: 'oil', amount: 4 }])
  })

  it('does not hoist cores or owners out of dated or conditional blocks', () => {
    expect(state.history.owner).toBe('AAA')
    expect(state.history.coreOf).toEqual(['AAA'])
    expect(state.history.dateHistory).toHaveLength(1)
    expect(state.history.dateHistory[0].coreOf).toEqual([])
    expect(state.history.dateHistory[0].effects).toEqual([
      expect.objectContaining({ key: 'IF', value: expect.stringMatching(/^\{[\s\S]*add_core_of = BBB[\s\S]*\}$/) })
    ])
  })

  it('reads state and province buildings', () => {
    expect(state.history.buildings).toEqual([
      { type: 'infrastructure', amount: 2 },
      { province: 1001, type: 'naval_base', amount: 1 }
    ])
  })
})

describe('applyStateSaves', () => {
  const state = parseOne(STATE_FILE)

  it('leaves the file byte-for-byte unchanged when nothing was edited', () => {
    const result = applyStateSaves(STATE_FILE, [{ original: state, updated: clone(state) }])
    expect(result.conflicts).toEqual([])
    expect(result.content).toBe(STATE_FILE)
  })

  it('changes only the edited lines', () => {
    const updated = clone(state)
    updated.manpower = 300000
    updated.history.coreOf.push('CCC')
    updated.provinceIds.push(1004)

    const result = applyStateSaves(STATE_FILE, [{ original: state, updated }])
    expect(result.conflicts).toEqual([])
    expect(result.content).toBe(
      STATE_FILE
        .replace('manpower = 250000', 'manpower = 300000')
        .replace('\t\tadd_core_of = AAA\n', '\t\tadd_core_of = AAA\n\t\tadd_core_of = CCC\n')
        .replace('1001 1002 1003\n', '1001 1002 1003 1004\n')
    )
    expect(parseOne(result.content)).toEqual(updated)
  })

  it('writes impassable with the real key and can remove it', () => {
    const updated = clone(state)
    delete updated.isImpassable
    const result = applyStateSaves(STATE_FILE, [{ original: state, updated }])
    expect(result.content).not.toMatch(/impassable/)
    expect(parseOne(result.content).isImpassable).toBeUndefined()
  })

  it('keeps block-valued effects verbatim and never quotes them', () => {
    const updated = clone(state)
    updated.history.dateHistory[0].owner = 'BBB'
    const result = applyStateSaves(STATE_FILE, [{ original: state, updated }])
    expect(result.content).toContain('IF = {\n\t\t\t\tlimit = { has_dlc = "Some Expansion" }')
    expect(result.content).not.toContain('"{')
    expect(parseOne(result.content)).toEqual(updated)
  })

  it('edits resources and buildings in place', () => {
    const updated = clone(state)
    updated.resources = [{ type: 'oil', amount: 8 }, { type: 'rubber', amount: 1 }]
    updated.history.buildings = [
      { type: 'infrastructure', amount: 3 },
      { province: 1002, type: 'bunker', amount: 2 }
    ]
    const result = applyStateSaves(STATE_FILE, [{ original: state, updated }])
    expect(result.content).toContain('oil=8 # was 6')
    expect(result.content).toContain('# steel=2')
    expect(result.content).not.toContain('naval_base')
    expect(parseOne(result.content)).toEqual(updated)
  })

  it('adds and removes dated history blocks', () => {
    const updated = clone(state)
    updated.history.dateHistory = [{
      date: { year: 1945, month: 5, day: 8 },
      owner: 'CCC',
      coreOf: ['CCC'],
      buildings: [],
      victoryPoints: [],
      effects: []
    }]
    const result = applyStateSaves(STATE_FILE, [{ original: state, updated }])
    expect(result.content).not.toContain('1939.1.1')
    expect(parseOne(result.content)).toEqual(updated)
  })

  it('only touches the targeted state in a multi-state file', () => {
    const other = STATE_FILE.replace('id=900', 'id=901').replace('owner = AAA', 'owner = ZZZ')
    const file = STATE_FILE + other
    const [first, second] = StatesTxt.parse(file)
    const updated = clone(first)
    updated.name = 'RENAMED'

    const result = applyStateSaves(file, [{ original: first, updated }])
    const [firstAfter, secondAfter] = StatesTxt.parse(result.content)
    expect(firstAfter.name).toBe('RENAMED')
    expect(secondAfter).toEqual(second)
    expect(result.content.endsWith(other)).toBe(true)
  })

  it('keeps on-disk changes to fields the user did not edit', () => {
    const diskFile = STATE_FILE.replace('state_category = rural', 'state_category = town')
    const updated = clone(state)
    updated.manpower = 1

    const result = applyStateSaves(diskFile, [{ original: state, updated }])
    expect(result.conflicts).toEqual([])
    expect(parseOne(result.content)).toMatchObject({ manpower: 1, stateCategory: 'town' })
  })

  it('reports a state that disappeared from the file', () => {
    const result = applyStateSaves('', [{ original: state, updated: clone(state) }])
    expect(result.conflicts).toEqual([expect.stringContaining('no longer present')])
  })
})
