import { analyzeProvinceBitmapFacts } from '../lib/provinceBitmapFacts'
import { decodeBmp24 } from '../lib/decodeBmp24'
import type { ProvinceBitmapFacts } from '../../../../shared/provinceCatalog'

export interface BitmapAnalysisInput {
  data: Uint8Array
}

export interface BitmapAnalysisOutput {
  facts: ProvinceBitmapFacts
}

self.onmessage = (event: MessageEvent<BitmapAnalysisInput>) => {
  const { width, height, pixels } = decodeBmp24(event.data.data)
  const facts = analyzeProvinceBitmapFacts({ data: pixels, width, height })
  self.postMessage({ facts } satisfies BitmapAnalysisOutput)
}
