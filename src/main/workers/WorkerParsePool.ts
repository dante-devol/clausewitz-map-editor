import os from 'os'
import { Worker } from 'worker_threads'
import { log } from '../logger'
import type { ParserKey, ParserInputMap, ParserOutputMap } from './parserRegistry'
import type { WorkerTask, WorkerResponse } from './fileParseWorker'

interface PendingTask {
  resolve: (result: ParserOutputMap[ParserKey][]) => void
  reject: (error: Error) => void
  key: ParserKey
  start: number
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
        key,
        start: performance.now()
      })

      // A growing backlog means the pool can't keep up with dispatch volume
      // (e.g. a mod with thousands of state files) — otherwise invisible.
      if (this.pending.size > 0 && this.pending.size % 200 === 0) {
        log.warn('[perf] WorkerParsePool backlog growing', { pending: this.pending.size })
      }

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

      const ms = Math.round(performance.now() - pending.start)
      if ('error' in response) {
        log.error('[perf] parse task failed', { key: pending.key, ms, error: response.error })
        pending.reject(new Error(response.error))
      } else {
        log.debug('[perf] parse task', { key: pending.key, ms })
        pending.resolve(response.result)
      }
    })

    // Rejects this worker's still-pending tasks and, unless the pool is being
    // disposed, replaces it with a fresh one. Safe to call twice for the same
    // failure (an uncaught exception fires 'error' then 'exit') — the second
    // call finds an already-cleared taskIds set and an already-replaced
    // workers[idx] (indexOf no longer finds this worker), so it's a no-op.
    const handleWorkerFailure = (error: Error): void => {
      // Previously silent: a crashed worker would quietly reject and respawn
      // with no trace, so a systemic parser bug would look like sporadic,
      // unexplained failures to whoever hit it.
      log.error('[perf] parser worker failed', {
        message: error.message,
        rejectedTasks: worker.taskIds.size,
        disposing: this.disposing
      })

      for (const taskId of worker.taskIds) {
        this.pending.get(taskId)?.reject(error)
        this.pending.delete(taskId)
      }
      worker.taskIds.clear()

      if (!this.disposing) {
        const idx = this.workers.indexOf(worker)
        if (idx !== -1) this.workers[idx] = this.spawnWorker()
      }
    }

    thread.on('error', handleWorkerFailure)

    // A worker can also exit without ever emitting 'error' (e.g. it called
    // process.exit(), or was killed) — without this, any task still assigned
    // to it would sit in `pending` forever and its caller would hang.
    thread.on('exit', (code) => {
      handleWorkerFailure(new Error(`Parser worker exited unexpectedly with code ${code}`))
    })

    return worker
  }
}
