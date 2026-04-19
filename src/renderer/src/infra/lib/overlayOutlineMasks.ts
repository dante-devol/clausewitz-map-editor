import type { ProvinceIndex } from './provinceAnalysis'

export interface OutlineGroupSource {
  width: number
  height: number
  canvas: OffscreenCanvas
}

type GroupResolver = (provinceId: number) => number | null

export function buildProvinceOutlineGroups(
  provinceIndex: ProvinceIndex,
  width: number,
  height: number
): OutlineGroupSource {
  return buildOutlineGroupSource(provinceIndex, width, height, (provinceId) => provinceId)
}

export function buildGroupedOutlineGroups(
  provinceIndex: ProvinceIndex,
  width: number,
  height: number,
  groupsByProvinceId: ReadonlyMap<number, number>
): OutlineGroupSource {
  return buildOutlineGroupSource(provinceIndex, width, height, (provinceId) => groupsByProvinceId.get(provinceId) ?? null)
}

function buildOutlineGroupSource(
  provinceIndex: ProvinceIndex,
  width: number,
  height: number,
  resolveGroup: GroupResolver
): OutlineGroupSource {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return { width, height, canvas }

  const imageData = ctx.createImageData(width, height)
  const data = imageData.data
  const idData = provinceIndex.idData

  for (let index = 0; index < idData.length; index++) {
    const provinceId = idData[index]
    if (provinceId === 0) continue

    const groupId = resolveGroup(provinceId)
    if (groupId === null || groupId <= 0) continue

    const base = index * 4
    data[base] = groupId & 0xff
    data[base + 1] = (groupId >> 8) & 0xff
    data[base + 2] = (groupId >> 16) & 0xff
    data[base + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)
  return { width, height, canvas }
}
