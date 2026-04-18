import type { CoreCommand } from '../contracts/CoreCommand'
import type { CoreState } from '../contracts/CoreState'

export function handleSessionCommand(state: CoreState, command: CoreCommand): CoreState | null {
  switch (command.type) {
    case 'session/openProjectStarted':
      return {
        ...state,
        session: {
          status: 'opening-project',
          projectId: null,
          projectPath: command.projectPath,
          errorMessage: null
        }
      }

    case 'session/projectOpened':
      return {
        ...state,
        session: {
          status: 'project-open',
          projectId: command.projectId,
          projectPath: command.projectPath,
          errorMessage: null
        }
      }

    case 'session/mapLoadingStarted':
      return {
        ...state,
        session: {
          ...state.session,
          status: 'loading-map',
          errorMessage: null
        }
      }

    case 'session/mapReady':
      return {
        ...state,
        session: {
          ...state.session,
          status: 'ready',
          errorMessage: null
        }
      }

    case 'session/failed':
      return {
        ...state,
        session: {
          ...state.session,
          status: 'error',
          errorMessage: command.message
        }
      }

    case 'session/cleared':
      return {
        ...state,
        session: {
          status: 'idle',
          projectId: null,
          projectPath: null,
          errorMessage: null
        },
        map: {
          ...state.map,
          selection: { kind: 'none' }
        }
      }

    default:
      return null
  }
}

