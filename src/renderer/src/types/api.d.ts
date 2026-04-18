import type { ApiContract } from '../../../shared/contract/api'

declare global {
  interface Window {
    api: ApiContract
  }
}

export {}
