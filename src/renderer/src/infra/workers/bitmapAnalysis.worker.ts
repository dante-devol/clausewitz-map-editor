import { analyzeProvinceBitmapFacts } from '../lib/provinceBitmapFacts'
import { decodeBmp24FromBase64 } from '../lib/decodeBmp24'
import type { ProvinceBitmapFacts } from '../../../../shared/provinceCatalog'

export interface BitmapAnalysisInput {
  b64: string
}

export interface BitmapAnalysisOutput {
  facts: ProvinceBitmapFacts
}

self.onmessage = (event: MessageEvent<BitmapAnalysisInput>) => {
  const { width, height, pixels } = decodeBmp24FromBase64(event.data.b64)
  const facts = analyzeProvinceBitmapFacts({ data: pixels, width, height })
  self.postMessage({ facts } satisfies BitmapAnalysisOutput)
}
