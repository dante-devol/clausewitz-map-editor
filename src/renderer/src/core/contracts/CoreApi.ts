import type { CoreCommand } from './CoreCommand'
import type { CoreState } from './CoreState'

export interface CoreApi {
  getState(): CoreState
  dispatch(command: CoreCommand): void
  subscribe(listener: () => void): () => void
}

