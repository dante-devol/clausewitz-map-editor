import type { StrategicRegionDefinition, WeatherPeriod } from '../../shared/mapDataTypes'
import type { StrategicRegionSaveRequest } from '../../shared/contract/api'
import { deepEqual } from '../../shared/deepEqual'
import { blockOf, firstAssignment, parseScript, type ScriptBlock } from './script/ScriptParser'
import { ScriptEditor, formatFloat, formatScalarString, quoteString } from './script/ScriptEditor'
import { numericAssignments, setAssignment, setNumberList, syncKeyedNumbers } from './script/ScriptEditing'
import { isWeatherWeightKey, periodAssignments, readRegion, readRegionId, regionAssignments } from './StrategicRegionsTxt'
import type { ScriptSaveResult } from './StatesTxtWriter'

// Applies strategic-region edits to the text of one file, in place. Same
// contract as applyStateSaves: only fields changed by the user are written,
// everything else is kept.
export function applyStrategicRegionSaves(
  source: string,
  requests: readonly StrategicRegionSaveRequest[]
): ScriptSaveResult {
  const doc = parseScript(source)
  const editor = new ScriptEditor(source)
  const conflicts: string[] = []

  const blocksById = new Map<number, ScriptBlock>()
  for (const entry of regionAssignments(doc.root)) {
    const block = entry.value as ScriptBlock
    const id = readRegionId(block)
    if (id !== null && !blocksById.has(id)) blocksById.set(id, block)
  }

  for (const { original, updated } of requests) {
    if (original.id !== updated.id) {
      conflicts.push(`Strategic region ${original.id}: the region ID cannot be changed.`)
      continue
    }
    const block = blocksById.get(original.id)
    const disk = block ? readRegion(block) : null
    if (!block || !disk) {
      conflicts.push(`Strategic region ${original.id}: no longer present in the file on disk.`)
      continue
    }

    // Fields the user didn't edit keep their on-disk value.
    const merge = <K extends 'name' | 'provinceIds' | 'weatherPeriods'>(key: K) =>
      deepEqual(updated[key], original[key]) ? disk[key] : updated[key]
    const target: StrategicRegionDefinition = {
      ...disk,
      name: merge('name'),
      provinceIds: merge('provinceIds'),
      weatherPeriods: merge('weatherPeriods')
    }
    editRegion(editor, block, disk, target)
  }

  if (conflicts.length > 0) return { content: source, conflicts }
  return { content: editor.hasEdits ? editor.apply() : source, conflicts }
}

function editRegion(
  editor: ScriptEditor,
  block: ScriptBlock,
  disk: StrategicRegionDefinition,
  target: StrategicRegionDefinition
): void {
  if (disk.name !== target.name) {
    const existing = firstAssignment(block, 'name')
    const quoted = existing?.value.kind === 'scalar' ? existing.value.quoted : true
    setAssignment(editor, block, 'name', quoted ? quoteString(target.name) : formatScalarString(target.name))
  }
  if (!deepEqual(disk.provinceIds, target.provinceIds)) {
    setNumberList(editor, block, 'provinces', target.provinceIds)
  }
  if (!deepEqual(disk.weatherPeriods, target.weatherPeriods)) {
    editWeather(editor, block, disk.weatherPeriods, target.weatherPeriods)
  }
}

function editWeather(
  editor: ScriptEditor,
  block: ScriptBlock,
  disk: WeatherPeriod[],
  target: WeatherPeriod[]
): void {
  const weatherEntry = firstAssignment(block, 'weather')
  const weatherBlock = blockOf(weatherEntry)

  if (!weatherBlock) {
    if (target.length > 0) editor.insert(block, { kind: 'end' }, ['weather = {', ...target.flatMap(periodLines).map((l) => `\t${l}`), '}'])
    return
  }

  const periods = periodAssignments(weatherBlock)
  if (target.length === 0 && periods.length === weatherBlock.entries.length) {
    editor.remove(weatherEntry!)
    return
  }

  // Periods are matched by position.
  for (let i = 0; i < Math.max(periods.length, target.length); i++) {
    if (i < periods.length && i < target.length) {
      if (!deepEqual(disk[i], target[i])) editPeriod(editor, periods[i].value as ScriptBlock, disk[i], target[i])
    } else if (i < periods.length) {
      editor.remove(periods[i])
    } else {
      editor.insert(weatherBlock, { kind: 'end' }, periodLines(target[i]))
    }
  }
}

function editPeriod(editor: ScriptEditor, block: ScriptBlock, disk: WeatherPeriod, target: WeatherPeriod): void {
  if (!deepEqual(disk.between, target.between)) {
    setAssignment(editor, block, 'between', pairText(target.between), { kind: 'start' })
  }
  if (!deepEqual(disk.temperature, target.temperature)) {
    const between = firstAssignment(block, 'between')
    setAssignment(editor, block, 'temperature', pairText(target.temperature), between ? { kind: 'after', entry: between } : { kind: 'start' })
  }
  if (disk.minSnowLevel !== target.minSnowLevel) {
    setAssignment(editor, block, 'min_snow_level', target.minSnowLevel === undefined ? undefined : formatFloat(target.minSnowLevel))
  }
  if (!deepEqual(disk.weatherWeights, target.weatherWeights)) {
    syncKeyedNumbers(
      editor,
      block,
      numericAssignments(block, isWeatherWeightKey),
      Object.entries(target.weatherWeights).map(([key, value]) => ({ key, value })),
      formatFloat
    )
  }
}

function pairText(pair: [number, number]): string {
  return `{ ${formatFloat(pair[0])} ${formatFloat(pair[1])} }`
}

function periodLines(period: WeatherPeriod): string[] {
  const lines = [
    'period = {',
    `\tbetween = ${pairText(period.between)}`,
    `\ttemperature = ${pairText(period.temperature)}`,
    ...Object.entries(period.weatherWeights).map(([key, weight]) => `\t${key} = ${formatFloat(weight)}`)
  ]
  if (period.minSnowLevel !== undefined) lines.push(`\tmin_snow_level = ${formatFloat(period.minSnowLevel)}`)
  lines.push('}')
  return lines
}
