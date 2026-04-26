import { analyzeProvinceBitmapFacts } from '../lib/provinceBitmapFacts'
import type { ProvinceBitmapFacts } from '../../../../shared/provinceCatalog'

export interface BitmapAnalysisInput {
  b64: string
}

export interface BitmapAnalysisOutput {
  facts: ProvinceBitmapFacts
}

self.onmessage = async (event: MessageEvent<BitmapAnalysisInput>) => {
  const { b64 } = event.data
  const response = await fetch(`data:image/bmp;base64,${b64}`)
  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob)
  const { width, height } = bitmap
  const offscreen = new OffscreenCanvas(width, height)
  const ctx = offscreen.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  const { data } = ctx.getImageData(0, 0, width, height)
  bitmap.close()

  const facts = analyzeProvinceBitmapFacts({ data, width, height })
  self.postMessage({ facts } satisfies BitmapAnalysisOutput)
}
