import { writeFileSync } from 'fs'
import type { StrategicRegionDefinition, WeatherPeriod } from '../../shared/mapDataTypes'

export class StrategicRegionsTxtWriter {
  write(region: StrategicRegionDefinition): void {
    if (!region.sourcePath) throw new Error(`Strategic region ${region.id} has no sourcePath`)
    writeFileSync(region.sourcePath, serialize(region), 'utf-8')
  }
}

function serialize(r: StrategicRegionDefinition): string {
  const lines: string[] = []
  lines.push('strategic_region = {')
  lines.push(`\tid = ${r.id}`)
  lines.push(`\tname = "${r.name}"`)
  lines.push(`\tprovinces = { ${r.provinceIds.join(' ')} }`)

  if (r.weatherPeriods.length > 0) {
    lines.push('\tweather = {')
    for (const period of r.weatherPeriods) {
      serializePeriod(period, lines)
    }
    lines.push('\t}')
  }

  lines.push('}')
  lines.push('')
  return lines.join('\n')
}

function serializePeriod(p: WeatherPeriod, lines: string[]): void {
  lines.push('\t\tperiod = {')
  lines.push(`\t\t\tbetween = { ${p.between[0]} ${p.between[1]} }`)
  lines.push(`\t\t\ttemperature = { ${p.temperature[0]} ${p.temperature[1]} }`)
  for (const [key, weight] of Object.entries(p.weatherWeights)) {
    lines.push(`\t\t\t${key} = ${weight}`)
  }
  if (p.minSnowLevel !== undefined) {
    lines.push(`\t\t\tmin_snow_level = ${p.minSnowLevel}`)
  }
  lines.push('\t\t}')
}
