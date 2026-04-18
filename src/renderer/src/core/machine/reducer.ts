import type { CoreCommand } from '../contracts/CoreCommand'
import type { CoreState } from '../contracts/CoreState'
import { handleAppCommand } from '../handlers/appHandlers'
import { handleMapCommand } from '../handlers/mapHandlers'
import { handleSessionCommand } from '../handlers/sessionHandlers'

export function reduceCoreState(state: CoreState, command: CoreCommand): CoreState {
  return (
    handleAppCommand(state, command) ??
    handleSessionCommand(state, command) ??
    handleMapCommand(state, command) ??
    state
  )
}
