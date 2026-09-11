// The map canvas is absolutely positioned with inset:0 (see MapCanvas.tsx's
// styles), so its CSS box size is governed entirely by its container — the
// width/height *attribute* only controls the backing store resolution and
// never affects clientWidth/clientHeight. That means it's safe to size the
// backing store at devicePixelRatio and leave the CSS size alone: this is
// the whole HiDPI fix, factored out so the arithmetic is unit-testable
// without a DOM.
export interface CanvasBackingSize {
  width: number
  height: number
}

export function computeCanvasBackingSize(
  clientWidth: number,
  clientHeight: number,
  devicePixelRatio: number
): CanvasBackingSize {
  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1
  return {
    width: Math.max(1, Math.round(clientWidth * dpr)),
    height: Math.max(1, Math.round(clientHeight * dpr))
  }
}
