import { createContext, useContext, useRef } from 'react'
import type { CoreApi } from '../core/contracts/CoreApi'
import { CoreSession } from '../core/session/CoreSession'

const CoreContext = createContext<CoreApi | null>(null)

export function CoreProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const sessionRef = useRef<CoreApi | null>(null)
  if (!sessionRef.current) {
    sessionRef.current = new CoreSession()
  }

  return (
    <CoreContext.Provider value={sessionRef.current}>
      {children}
    </CoreContext.Provider>
  )
}

export function useCoreApi(): CoreApi {
  const api = useContext(CoreContext)
  if (!api) throw new Error('CoreProvider is missing')
  return api
}

