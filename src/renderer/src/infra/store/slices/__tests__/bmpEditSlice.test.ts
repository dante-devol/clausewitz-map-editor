import { describe, expect, it } from 'vitest'
import { create } from 'zustand'
import { createBmpEditSlice, type BmpEditSlice } from '../bmpEditSlice'
import type { BmpPixelStroke } from '../../../../../../shared/provinceEditing'

function stroke(id: string): BmpPixelStroke {
  return {
    id,
    targetProvinceColor: 0,
    pixelCount: 1,
    pixels: [{ offset: 0, oldR: 1, oldG: 2, oldB: 3, newR: 4, newG: 5, newB: 6 }]
  }
}

function makeStore() {
  return create<BmpEditSlice>()((...a) => createBmpEditSlice(...a))
}

describe('revertBmpStroke', () => {
  it('reverts the most recently added stroke', () => {
    const store = makeStore()
    store.getState().addBmpStroke(stroke('a'))
    store.getState().addBmpStroke(stroke('b'))

    store.getState().revertBmpStroke('b')

    expect(store.getState().pendingBmpStrokes.map((s) => s.id)).toEqual(['a'])
    expect(store.getState().pendingRevertPixels).toEqual(stroke('b').pixels)
  })

  // A stroke's recorded "old" colors are only valid immediately after it was
  // painted; reverting an older stroke once a newer one exists would restore
  // stale colors over the newer stroke's pixels.
  it('refuses to revert a stroke that is not the newest', () => {
    const store = makeStore()
    store.getState().addBmpStroke(stroke('a'))
    store.getState().addBmpStroke(stroke('b'))

    store.getState().revertBmpStroke('a')

    expect(store.getState().pendingBmpStrokes.map((s) => s.id)).toEqual(['a', 'b'])
    expect(store.getState().pendingRevertPixels).toBeNull()
  })

  it('allows reverting strokes one at a time, newest first', () => {
    const store = makeStore()
    store.getState().addBmpStroke(stroke('a'))
    store.getState().addBmpStroke(stroke('b'))

    store.getState().revertBmpStroke('b')
    store.getState().revertBmpStroke('a')

    expect(store.getState().pendingBmpStrokes).toEqual([])
  })

  it('no-ops on an unknown or already-removed stroke id', () => {
    const store = makeStore()
    store.getState().addBmpStroke(stroke('a'))

    store.getState().revertBmpStroke('does-not-exist')

    expect(store.getState().pendingBmpStrokes.map((s) => s.id)).toEqual(['a'])
    expect(store.getState().pendingRevertPixels).toBeNull()
  })
})

describe('bmp save lifecycle', () => {
  it('requestBmpSave marks saving and bumps the request id', () => {
    const store = makeStore()
    store.getState().requestBmpSave()
    expect(store.getState()).toMatchObject({ bmpSaveRequestId: 1, bmpSaveStatus: 'saving', bmpSaveError: null })
  })

  it('bmpSaveSucceeded clears pending strokes and returns to idle', () => {
    const store = makeStore()
    store.getState().addBmpStroke(stroke('a'))
    store.getState().requestBmpSave()

    store.getState().bmpSaveSucceeded()

    expect(store.getState()).toMatchObject({ bmpSaveStatus: 'idle', bmpSaveError: null, pendingBmpStrokes: [] })
  })

  it('bmpSaveFailed keeps pending strokes and records the error', () => {
    const store = makeStore()
    store.getState().addBmpStroke(stroke('a'))
    store.getState().requestBmpSave()

    store.getState().bmpSaveFailed('disk full')

    expect(store.getState().bmpSaveStatus).toBe('error')
    expect(store.getState().bmpSaveError).toBe('disk full')
    expect(store.getState().pendingBmpStrokes).toHaveLength(1)
  })
})
