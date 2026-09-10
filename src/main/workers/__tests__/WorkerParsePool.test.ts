import { EventEmitter } from 'events'
import { beforeEach, describe, expect, it, vi } from 'vitest'

class FakeWorker extends EventEmitter {
  postMessage = vi.fn()
  terminate = vi.fn().mockResolvedValue(0)
}

let createdWorkers: FakeWorker[] = []

vi.mock('worker_threads', () => ({
  Worker: vi.fn().mockImplementation(() => {
    const worker = new FakeWorker()
    createdWorkers.push(worker)
    return worker
  })
}))

// Imported after the mock so WorkerParsePool's `new Worker(...)` picks it up.
const { WorkerParsePool } = await import('../WorkerParsePool')

beforeEach(() => {
  createdWorkers = []
})

describe('WorkerParsePool', () => {
  it('rejects a pending task and respawns a worker that exits without ever emitting error', async () => {
    const pool = new WorkerParsePool(1)
    const worker = createdWorkers[0]

    const dispatchPromise = pool.dispatch('a.txt', 'terrain')
    worker.emit('exit', 1) // a hard crash: straight to 'exit', no 'error'

    await expect(dispatchPromise).rejects.toThrow(/exited unexpectedly/)

    // The dead worker must have been replaced so later dispatches still work.
    expect(createdWorkers).toHaveLength(2)
    void pool.dispatch('b.txt', 'terrain')
    expect(createdWorkers[1].postMessage).toHaveBeenCalledTimes(1)
  })

  it('does not double-reject or spawn a second replacement when error is followed by exit', async () => {
    const pool = new WorkerParsePool(1)
    const worker = createdWorkers[0]

    const dispatchPromise = pool.dispatch('a.txt', 'terrain')
    let rejections = 0
    dispatchPromise.catch(() => { rejections++ })

    worker.emit('error', new Error('boom'))
    worker.emit('exit', 1)
    await Promise.resolve()

    expect(rejections).toBe(1)
    expect(createdWorkers).toHaveLength(2) // one crash, one replacement
  })

  it('does not try to respawn workers while disposing', async () => {
    const pool = new WorkerParsePool(1)
    const worker = createdWorkers[0]

    const disposePromise = pool.dispose()
    worker.emit('exit', 0)
    await disposePromise

    expect(createdWorkers).toHaveLength(1) // no replacement spawned
  })
})
