import { readFileSync } from 'fs'
import { parentPort } from 'worker_threads'
import { parserRegistry, type ParserKey, type ParserInputMap, type ParserOutputMap } from './parserRegistry'

export interface WorkerTask {
  taskId: number
  filePath: string
  key: ParserKey
  extra?: Omit<ParserInputMap[ParserKey], 'content'>
}

export interface WorkerSuccess<K extends ParserKey = ParserKey> {
  taskId: number
  result: ParserOutputMap[K][]
}

export interface WorkerFailure {
  taskId: number
  error: string
}

export type WorkerResponse = WorkerSuccess | WorkerFailure

parentPort!.on('message', ({ taskId, filePath, key, extra }: WorkerTask) => {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const input = { content, ...extra } as ParserInputMap[typeof key]
    const result = parserRegistry[key](input)
    parentPort!.postMessage({ taskId, result } satisfies WorkerSuccess)
  } catch (err) {
    parentPort!.postMessage({ taskId, error: (err as Error).message } satisfies WorkerFailure)
  }
})
