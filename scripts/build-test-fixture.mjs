// Builds a small, realistic test fixture from a real HOI4 install: a cropped
// (but otherwise untouched, real-encoding) provinces.bmp plus the full real
// definition.csv/continent.txt/states/strategicregions/common files, and a
// minimal test mod folder with just a descriptor.mod. See
// docs/testing-issue-4.md for how this fits into the wider test harness.
//
// Usage:
//   node scripts/build-test-fixture.mjs <hoi4GamePath> <outDir> [x0 y0 w h]
//
// x0/y0/w/h crop the source provinces.bmp (default: a dense central-Europe
// slice). Coordinates are in the source bitmap's pixel space (5632x2048 for
// vanilla 1.x).
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'fs'
import { join } from 'path'

function cropBmp(buf, x0, y0, cropW, cropH) {
  const dataOffset = buf.readUInt32LE(10)
  const dibSize = buf.readUInt32LE(14)
  const width = buf.readInt32LE(18)
  const heightRaw = buf.readInt32LE(22)
  const bpp = buf.readUInt16LE(28)
  const compression = buf.readUInt32LE(30)
  if (compression !== 0) throw new Error(`unsupported compression ${compression}`)
  if (bpp !== 24) throw new Error(`unsupported bpp ${bpp}`)
  if (dataOffset !== 14 + dibSize) throw new Error('unexpected color table present')

  const topDown = heightRaw < 0
  const height = Math.abs(heightRaw)
  if (x0 < 0 || y0 < 0 || x0 + cropW > width || y0 + cropH > height) {
    throw new Error(`crop out of bounds: source is ${width}x${height}`)
  }

  const bytesPerPixel = 3
  const rowSize = Math.floor((bpp * width + 31) / 32) * 4
  const newRowSize = Math.floor((bpp * cropW + 31) / 32) * 4
  const newPixelDataSize = newRowSize * cropH
  const newFileSize = dataOffset + newPixelDataSize

  const out = Buffer.alloc(newFileSize)
  buf.copy(out, 0, 0, dataOffset)
  out.writeInt32LE(cropW, 18)
  out.writeInt32LE(topDown ? -cropH : cropH, 22)
  out.writeUInt32LE(newFileSize, 2)
  out.writeUInt32LE(newPixelDataSize, 34)

  for (let row = 0; row < cropH; row++) {
    const imageRow = y0 + row
    const srcFileRow = topDown ? imageRow : height - 1 - imageRow
    const srcStart = dataOffset + srcFileRow * rowSize + x0 * bytesPerPixel
    const dstFileRow = topDown ? row : cropH - 1 - row
    const dstStart = dataOffset + dstFileRow * newRowSize
    buf.copy(out, dstStart, srcStart, srcStart + cropW * bytesPerPixel)
  }

  return out
}

const [, , gamePath, outDir, x0, y0, w, h] = process.argv
if (!gamePath || !outDir) {
  console.error('usage: node scripts/build-test-fixture.mjs <hoi4GamePath> <outDir> [x0 y0 w h]')
  process.exit(1)
}
const crop = { x0: Number(x0 ?? 3100), y0: Number(y0 ?? 250), w: Number(w ?? 700), h: Number(h ?? 500) }

const fixtureGame = join(outDir, 'fixture-game')
const fixtureMod = join(outDir, 'fixture-mod')

for (const dir of [
  join(fixtureGame, 'map', 'strategicregions'),
  join(fixtureGame, 'history', 'states'),
  join(fixtureGame, 'common', 'terrain'),
  join(fixtureGame, 'common', 'state_category'),
  join(fixtureGame, 'common', 'resources'),
  join(fixtureGame, 'common', 'buildings'),
  fixtureMod
]) mkdirSync(dir, { recursive: true })

console.log(`cropping provinces.bmp at (${crop.x0},${crop.y0}) ${crop.w}x${crop.h}...`)
const cropped = cropBmp(readFileSync(join(gamePath, 'map', 'provinces.bmp')), crop.x0, crop.y0, crop.w, crop.h)
writeFileSync(join(fixtureGame, 'map', 'provinces.bmp'), cropped)

for (const [rel, dst] of [
  ['map/definition.csv', 'map/definition.csv'],
  ['map/continent.txt', 'map/continent.txt'],
  ['map/default.map', 'map/default.map'],
  ['common/weather.txt', 'common/weather.txt']
]) {
  writeFileSync(join(fixtureGame, dst), readFileSync(join(gamePath, rel)))
}

for (const rel of [
  'history/states',
  'map/strategicregions',
  'common/terrain',
  'common/state_category',
  'common/resources',
  'common/buildings'
]) {
  cpSync(join(gamePath, rel), join(fixtureGame, rel), { recursive: true })
}

if (!existsSync(join(fixtureMod, 'descriptor.mod'))) {
  writeFileSync(join(fixtureMod, 'descriptor.mod'), [
    'name="Issue4 Test Mod"',
    'version="1.0"',
    'supported_version="*"',
    'path="mod/issue4-test-mod"',
    ''
  ].join('\n'))
}

console.log(`fixture written to ${outDir}`)
console.log(`  game: ${fixtureGame}`)
console.log(`  mod:  ${fixtureMod}`)
