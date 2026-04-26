import { readFile } from 'fs/promises'
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

// Maximum number of concurrent file reads per worker thread.
// Parse runs synchronously after each read, so true CPU parallelism
// comes from having multiple worker threads; this controls I/O pipelining
// within a single thread.
const MAX_CONCURRENT_IO = 4

let inflight = 0
const localQueue: WorkerTask[] = []

function tryDispatch(): void {
  while (inflight < MAX_CONCURRENT_IO && localQueue.length > 0) {
    const task = localQueue.shift()!
    inflight++
    runTask(task).finally(() => {
      inflight--
      tryDispatch()
    })
  }
}

async function runTask(task: WorkerTask): Promise<void> {
  try {
    const content = await readFile(task.filePath, 'utf-8')
    const input = { content, ...task.extra } as ParserInputMap[typeof task.key]
    const result = parserRegistry[task.key](input)
    parentPort!.postMessage({ taskId: task.taskId, result } satisfies WorkerSuccess)
  } catch (err) {
    parentPort!.postMessage({ taskId: task.taskId, error: (err as Error).message } satisfies WorkerFailure)
  }
}

parentPort!.on('message', (task: WorkerTask) => {
  localQueue.push(task)
  tryDispatch()
})
