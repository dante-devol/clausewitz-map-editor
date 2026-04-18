import { useRef, useSyncExternalStore } from 'react'
import { useCoreApi } from './CoreProvider'
import type { CoreState } from '../core/contracts/CoreState'

export function useCoreSelector<T>(selector: (state: CoreState) => T): T {
  const api = useCoreApi()
  const cacheRef = useRef<{
    state: CoreState | null
    selector: ((state: CoreState) => T) | null
    value: T | null
  }>({
    state: null,
    selector: null,
    value: null
  })

  const getSnapshot = () => {
    const state = api.getState()
    if (cacheRef.current.state === state && cacheRef.current.selector === selector) {
      return cacheRef.current.value as T
    }

    const value = selector(state)
    cacheRef.current = { state, selector, value }
    return value
  }

  return useSyncExternalStore(
    api.subscribe.bind(api),
    getSnapshot,
    getSnapshot
  )
}
