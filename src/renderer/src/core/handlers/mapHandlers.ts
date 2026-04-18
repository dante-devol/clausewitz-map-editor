import type { CoreCommand } from '../contracts/CoreCommand'
import type { CoreState } from '../contracts/CoreState'

export function handleMapCommand(state: CoreState, command: CoreCommand): CoreState | null {
  switch (command.type) {
    case 'map/setDisplayMode':
      return {
        ...state,
        map: {
          ...state.map,
          displayMode: command.mode
        }
      }

    case 'map/selectProvince':
      return {
        ...state,
        map: {
          ...state.map,
          selection: { kind: 'province', provinceId: command.provinceId }
        }
      }

    case 'map/clearSelection':
      return {
        ...state,
        map: {
          ...state.map,
          selection: { kind: 'none' }
        }
      }

    default:
      return null
  }
}

