import os from 'os'
import { Worker } from 'worker_threads'
import type { ParserKey, ParserInputMap, ParserOutputMap } from './parserRegistry'
import type { WorkerTask, WorkerResponse } from './fileParseWorker'

interface PendingTask {
  task: WorkerTask
  resolve: (result: ParserOutputMap[ParserKey][]) => void
  reject: (error: Error) => void
}

interface PoolWorker {
  thread: Worker
  busy: boolean
}

export class WorkerParsePool {
  private readonly workers: PoolWorker[]
  private readonly queue: PendingTask[] = []
  private nextTaskId = 0
  private readonly pending = new Map<number, PendingTask>()
  private disposing = false

  constructor(size = Math.max(1, os.cpus().length - 1)) {
    this.workers = Array.from({ length: size }, () => this.spawnWorker())
  }

  dispatch<K extends ParserKey>(
    filePath: string,
    key: K,
    extra?: Omit<ParserInputMap[K], 'content'>
  ): Promise<ParserOutputMap[K][]> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        taskId: this.nextTaskId++,
        filePath,
        key,
        extra: extra as Omit<ParserInputMap[ParserKey], 'content'> | undefined,
      }
      const pending: PendingTask = {
        task,
        resolve: resolve as (result: ParserOutputMap[ParserKey][]) => void,
        reject,
      }
      this.pending.set(task.taskId, pending)

      const idle = this.workers.find((w) => !w.busy)
      if (idle) {
        this.send(idle, pending)
      } else {
        this.queue.push(pending)
      }
    })
  }

  dispose(): Promise<void> {
    this.disposing = true

    // Reject any queued tasks that haven't started yet.
    for (const pending of this.queue) {
      pending.reject(new Error('WorkerParsePool disposed'))
    }
    this.queue.length = 0

    // Wait for all in-flight tasks to settle, then terminate.
    const inFlight = [...this.pending.values()]
    const settled = inFlight.length > 0
      ? Promise.all(inFlight.map((p) => new Promise<void>((res) => {
          const original = p.resolve
          const originalReject = p.reject
          p.resolve = (...args) => { original(...args); res() }
          p.reject = (...args) => { originalReject(...args); res() }
        })))
      : Promise.resolve()

    return settled.then(() => {
      for (const w of this.workers) w.thread.terminate()
    })
  }

  private spawnWorker(): PoolWorker {
    const thread = new Worker(new URL('./fileParseWorker.js', import.meta.url))
    const worker: PoolWorker = { thread, busy: false }

    thread.on('message', (response: WorkerResponse) => {
      const pending = this.pending.get(response.taskId)
      if (!pending) return
      this.pending.delete(response.taskId)

      if ('error' in response) {
        pending.reject(new Error(response.error))
      } else {
        pending.resolve(response.result)
      }

      worker.busy = false
      this.drainQueue(worker)
    })

    thread.on('error', (err) => {
      // Find the task this worker was running and reject it.
      for (const [taskId, pending] of this.pending) {
        pending.reject(err)
        this.pending.delete(taskId)
        break
      }
      worker.busy = false
      if (!this.disposing) {
        // Replace the crashed worker.
        const idx = this.workers.indexOf(worker)
        if (idx !== -1) this.workers[idx] = this.spawnWorker()
      }
      this.drainQueue(worker)
    })

    return worker
  }

  private send(worker: PoolWorker, pending: PendingTask): void {
    worker.busy = true
    worker.thread.postMessage(pending.task)
  }

  private drainQueue(worker: PoolWorker): void {
    if (this.queue.length === 0) return
    const next = this.queue.shift()!
    this.send(worker, next)
  }
}
