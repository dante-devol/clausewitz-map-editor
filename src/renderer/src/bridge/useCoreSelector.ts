import { useSyncExternalStore } from 'react'
import { useCoreApi } from './CoreProvider'
import type { CoreState } from '../core/contracts/CoreState'

export function useCoreSelector<T>(selector: (state: CoreState) => T): T {
  const api = useCoreApi()
  return useSyncExternalStore(
    api.subscribe.bind(api),
    () => selector(api.getState()),
    () => selector(api.getState())
  )
}
