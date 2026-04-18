import type { CoreApi } from '../contracts/CoreApi'
import type { CoreCommand } from '../contracts/CoreCommand'
import type { CoreState } from '../contracts/CoreState'
import { INITIAL_CORE_STATE } from '../contracts/CoreState'
import { reduceCoreState } from '../machine/reducer'

export class CoreSession implements CoreApi {
  private state: CoreState
  private readonly listeners = new Set<() => void>()

  constructor(initialState: CoreState = INITIAL_CORE_STATE) {
    this.state = initialState
  }

  getState(): CoreState {
    return this.state
  }

  dispatch(command: CoreCommand): void {
    const next = reduceCoreState(this.state, command)
    if (next === this.state) return
    this.state = next
    for (const listener of this.listeners) listener()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

