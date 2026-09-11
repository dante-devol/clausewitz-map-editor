# Testing harness for issue 4 (and beyond)

The renderer needs `window.api` (Electron's contextBridge/preload surface),
and there's no way to drive an actual Electron window through the tools
available in this environment. This harness runs the *real* renderer code in
a plain browser tab instead, backed by a small Node server that reuses the
*real* main-process `ProjectLoader` and parsers against a small, real
HOI4-derived fixture — so it exercises actual BMP decoding, actual WebGL
rendering, and actual province/state/region parsing, not a hand-rolled fake.

It was built to unblock testing of the deferred parts of
[`docs/code-review-2026-09.md`](code-review-2026-09.md) section 4 (4.3, and
the rest of 4.5: HiDPI canvas sizing, WebGL context loss, painted-index
staleness), but it's generally useful for anything that needs a running,
visually-inspectable app.

## One-time setup

You need a real HOI4 install to source fixture data from (its assets are
copyrighted, so nothing derived from it is committed to the repo).

```bash
npm install
node scripts/build-test-fixture.mjs "<path to Hearts of Iron IV install>" <some/local/outDir>
```

This writes `<outDir>/fixture-game` (a small real crop of `provinces.bmp`
plus the full real `definition.csv`, `continent.txt`, `history/states`,
`map/strategicregions`, and the small `common/*` folders) and
`<outDir>/fixture-mod` (just a `descriptor.mod` — an empty mod overlay). Pass
`x0 y0 w h` to crop a different region of `provinces.bmp` if you want denser
or sparser terrain than the default central-Europe slice.

Put `outDir` wherever you like — your scratchpad directory is a reasonable
default, since the fixture is regenerable and not meant to be committed.

## Running it

Two processes, both dev-only:

```bash
# 1. Serves real MapDataSnapshot/state/region JSON, computed with the actual
#    main-process ProjectLoader/parsers (no Electron, no worker_threads —
#    parsing runs synchronously, which is fine for a small fixture).
node_modules/.bin/vite-node scripts/harness-server.ts <outDir>/fixture-game <outDir>/fixture-mod 4455

# 2. Serves the renderer through plain Vite (no Electron launch).
#    Use the Browser tool's preview_start with the "harness" entry already
#    added to .claude/launch.json (or run directly: npx vite --config vite.harness.config.ts)
```

Then open `http://localhost:5173/harness.html?port=4455` (the `port` query
param points the page at the harness server). It boots straight into
`MapView` with the fixture loaded — no project-selection screen, since that
depends on real Electron dialogs the harness stubs out.

## What this does and doesn't give you

Works for real: BMP decode → WebGL2 render, zoom/pan, province
selection/hover, the states/strategic-regions panels, HiDPI emulation (the
Browser tool's `resize_window` mobile preset gives `devicePixelRatio: 2`),
and triggering `WEBGL_lose_context` via `javascript_tool` to test context-loss
handling.

Not wired up: `map.saveBmp`/`map.save`/`map.saveStates`/`map.saveStrategicRegions`
are no-ops in `harness-mockApi.ts` (log and return) rather than real writes —
wire them to the harness server if a future test needs to verify a save
round-trip against the fixture mod folder.

Note: `harness-main.tsx` deliberately does **not** wrap the app in
`<StrictMode>`. `useMapLoader`'s effect cleanup unconditionally calls
`sessionCleared()`, and StrictMode's dev-only mount → cleanup → remount cycle
runs that cleanup before the initial `map.load()` resolves, resetting the
session to `idle` before anything renders. That's a real fragility worth
fixing at some point (the cleanup should probably not reset session state
when nothing has actually failed/unmounted-for-real), but reproducing it
isn't this harness's job.

## Files

- `scripts/build-test-fixture.mjs` — builds the fixture from a real game path (not committed: the fixture itself)
- `scripts/harness-server.ts` — the data server
- `vite.harness.config.ts` — plain-Vite config for the renderer, no Electron
- `src/renderer/harness.html` + `src/renderer/src/harness-main.tsx` + `src/renderer/src/harness-mockApi.ts` — the browser entry point and mock `window.api`
- `.claude/launch.json` has a `"harness"` entry wired to `vite.harness.config.ts` (gitignored, local-only)
