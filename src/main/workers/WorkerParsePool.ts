import os from 'os'
import { Worker } from 'worker_threads'
import type { ParserKey, ParserInputMap, ParserOutputMap } from './parserRegistry'
import type { WorkerTask, WorkerResponse } from './fileParseWorker'

interface PendingTask {
  resolve: (result: ParserOutputMap[ParserKey][]) => void
  reject: (error: Error) => void
}

interface PoolWorker {
  thread: Worker
  // Task IDs currently dispatched to this worker (for crash attribution).
  taskIds: Set<number>
}

export class WorkerParsePool {
  private readonly workers: PoolWorker[]
  private nextTaskId = 0
  private roundRobinIndex = 0
  private readonly pending = new Map<number, PendingTask>()
  private disposing = false

  // Each worker pipelines up to MAX_CONCURRENT_IO reads internally, so the
  // pool only needs one thread per logical core to saturate both I/O and CPU.
  constructor(size = Math.max(1, os.cpus().length)) {
    this.workers = Array.from({ length: size }, () => this.spawnWorker())
  }

  dispatch<K extends ParserKey>(
    filePath: string,
    key: K,
    extra?: Omit<ParserInputMap[K], 'content'>
  ): Promise<ParserOutputMap[K][]> {
    return new Promise((resolve, reject) => {
      const taskId = this.nextTaskId++
      this.pending.set(taskId, {
        resolve: resolve as (result: ParserOutputMap[ParserKey][]) => void,
        reject,
      })

      // Round-robin across workers. Each worker manages its own internal
      // queue, so we never need to hold tasks back at the pool level.
      const worker = this.workers[this.roundRobinIndex % this.workers.length]
      this.roundRobinIndex++
      worker.taskIds.add(taskId)
      worker.thread.postMessage({ taskId, filePath, key, extra } satisfies WorkerTask)
    })
  }

  dispose(): Promise<void> {
    this.disposing = true
    for (const pending of this.pending.values()) {
      pending.reject(new Error('WorkerParsePool disposed'))
    }
    this.pending.clear()
    return Promise.all(this.workers.map((w) => w.thread.terminate())).then(() => undefined)
  }

  private spawnWorker(): PoolWorker {
    const thread = new Worker(new URL('./fileParseWorker.js', import.meta.url))
    const worker: PoolWorker = { thread, taskIds: new Set() }

    thread.on('message', (response: WorkerResponse) => {
      const pending = this.pending.get(response.taskId)
      if (!pending) return
      this.pending.delete(response.taskId)
      worker.taskIds.delete(response.taskId)

      if ('error' in response) {
        pending.reject(new Error(response.error))
      } else {
        pending.resolve(response.result)
      }
    })

    thread.on('error', (err) => {
      for (const taskId of worker.taskIds) {
        this.pending.get(taskId)?.reject(err)
        this.pending.delete(taskId)
      }
      worker.taskIds.clear()

      if (!this.disposing) {
        const idx = this.workers.indexOf(worker)
        if (idx !== -1) this.workers[idx] = this.spawnWorker()
      }
    })

    return worker
  }
}
