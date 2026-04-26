import { writeFileSync } from 'fs'
import type {
  StateDefinition,
  StateBuildingDefinition,
  ProvinceBuildingDefinition
} from '../../shared/mapDataTypes'

export class StatesTxtWriter {
  write(state: StateDefinition): void {
    if (!state.sourcePath) throw new Error(`State ${state.id} has no sourcePath`)
    writeFileSync(state.sourcePath, serialize(state), 'utf-8')
  }
}

function serialize(s: StateDefinition): string {
  const lines: string[] = []
  lines.push('state = {')
  lines.push(`\tid = ${s.id}`)
  lines.push(`\tname = "${s.name}"`)
  lines.push(`\tmanpower = ${s.manpower}`)
  lines.push(`\tstate_category = ${s.stateCategory}`)

  if (s.isImpassable) lines.push('\tis_impassable = yes')
  if (s.localSupplies !== undefined) lines.push(`\tlocal_supplies = ${s.localSupplies}`)
  if (s.buildingsMaxLevelFactor !== undefined) lines.push(`\tbuildings_max_level_factor = ${s.buildingsMaxLevelFactor}`)

  if (s.resources && s.resources.length > 0) {
    lines.push('\tresources = {')
    for (const res of s.resources) {
      lines.push(`\t\t${res.type} = ${res.amount}`)
    }
    lines.push('\t}')
  }

  lines.push(`\tprovinces = { ${s.provinceIds.join(' ')} }`)

  lines.push('\thistory = {')
  if (s.history.owner) lines.push(`\t\towner = ${s.history.owner}`)
  for (const tag of s.history.coreOf) lines.push(`\t\tadd_core_of = ${tag}`)
  for (const vp of s.history.victoryPoints) {
    lines.push(`\t\tvictory_points = { ${vp.province} ${vp.value} }`)
  }
  serializeBuildings(s.history.buildings, lines)
  for (const dh of s.history.dateHistory) {
    const d = dh.date
    lines.push(`\t\t${d.year}.${d.month}.${d.day} = {`)
    if (dh.owner) lines.push(`\t\t\towner = ${dh.owner}`)
    for (const tag of dh.coreOf) lines.push(`\t\t\tadd_core_of = ${tag}`)
    for (const vp of dh.victoryPoints) {
      lines.push(`\t\t\tvictory_points = { ${vp.province} ${vp.value} }`)
    }
    serializeBuildings(dh.buildings, lines, '\t\t\t')
    lines.push(`\t\t}`)
  }
  lines.push(`\t}`)

  lines.push('}')
  lines.push('')
  return lines.join('\n')
}

function serializeBuildings(
  buildings: (StateBuildingDefinition | ProvinceBuildingDefinition)[],
  lines: string[],
  indent = '\t\t'
): void {
  const stateLevel = buildings.filter((b): b is StateBuildingDefinition => !('province' in b))
  const provinceLevel = buildings.filter((b): b is ProvinceBuildingDefinition => 'province' in b)

  if (stateLevel.length === 0 && provinceLevel.length === 0) return

  lines.push(`${indent}buildings = {`)
  for (const b of stateLevel) {
    lines.push(`${indent}\t${b.type} = ${b.amount}`)
  }
  for (const b of provinceLevel) {
    lines.push(`${indent}\t${b.province} = {`)
    lines.push(`${indent}\t\t${b.type} = ${b.amount}`)
    lines.push(`${indent}\t}`)
  }
  lines.push(`${indent}}`)
}
