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

    case 'map/setOverlayVisibility':
      return {
        ...state,
        map: {
          ...state.map,
          overlays: state.map.overlays.map((overlay) => (
            overlay.id === command.overlayId ? { ...overlay, visible: command.visible } : overlay
          ))
        }
      }

    case 'map/setOverlayOpacity':
      return {
        ...state,
        map: {
          ...state.map,
          overlays: state.map.overlays.map((overlay) => (
            overlay.id === command.overlayId
              ? { ...overlay, opacity: Math.max(0, Math.min(100, command.opacity)) }
              : overlay
          ))
        }
      }

    case 'map/setOverlayFilterRules':
      return {
        ...state,
        map: {
          ...state.map,
          overlays: state.map.overlays.map((overlay) => (
            overlay.id === command.overlayId
              ? { ...overlay, filterRules: command.rules }
              : overlay
          ))
        }
      }

    case 'map/moveOverlay': {
      const fromIndex = state.map.overlays.findIndex((overlay) => overlay.id === command.overlayId)
      const toIndex = state.map.overlays.findIndex((overlay) => overlay.id === command.targetOverlayId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return state

      const overlays = [...state.map.overlays]
      const [moved] = overlays.splice(fromIndex, 1)
      overlays.splice(toIndex, 0, moved)

      return {
        ...state,
        map: {
          ...state.map,
          overlays
        }
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
