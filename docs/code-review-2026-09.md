# Code Review — Problems and Fixes (2026-09-10)

Review of `main` at `76d9fd1`. Findings come from reading the source directly (not from existing docs), running `tsc`, and round-tripping vanilla HOI4 files through the parsers and writers.

Severity key: **P0** = data loss or corruption, **P1** = broken feature or wrong behaviour, **P2** = structural or design gap, **P3** = performance or hygiene.

---

## Summary

| # | Problem | Severity |
|---|---------|----------|
| 1.1 | Saves can write into the base game install | P0 |
| 1.2 | State and strategic-region writers are lossy and corrupt script | P0 |
| 1.3 | Writers replace the whole file with a single object | P0 |
| 1.4 | External `definition.csv` changes are ignored, then overwritten | P0 |
| 2.1 | Paint-mode BMP save never runs | P1 |
| 2.2 | Out-of-order stroke revert corrupts pixels; no undo | P1 |
| 2.3 | New province IDs can collide | P1 |
| 2.4 | A province can end up in two states or two regions | P1 |
| 2.5 | A failed project open shows a broken editor | P1 |
| 2.6 | Back and close don't check unsaved changes or dispose the session | P1 |
| 2.7 | Stale async results can land in a new session | P1 |
| 2.8 | Smaller parser, config and worker bugs | P1 |
| 3.x | Structural gaps (validation, watching, trust boundary, feature gaps) | P2 |
| 4.x | Performance hotspots | P3 |
| 5.x | Tooling, typechecking, dead code | P3 |

---

## 1. Saving can destroy or corrupt data (P0)

> **Status (2026-09-10): addressed.**
> - All writes go through `resolveWriteTarget` (`src/main/services/projects/writeTargets.ts`): game files are copied into the mod folder on first save and written atomically. A mod folder that is (or sits inside) the game install is refused at open.
> - The six ad-hoc parsers are replaced by one span-preserving parser (`src/main/parsers/script/`). The state and strategic-region writers edit files in place and only touch fields that changed.
> - Saves carry the pre-edit baseline and are refused if an edited field also changed on disk. `definition.csv` saves carry a content hash and preserve unchanged lines verbatim.
> - Tests: `npm test`. Set `HOI4_GAME_PATH` to also round-trip every vanilla state and strategic region.
>
> Files saved by the old writers may already contain damage: quoted `"{ ... }"` blocks, `is_impassable`, sign-flipped temperatures, or cores hoisted out of dated blocks. The new writer won't repair them; check any files saved before this change.

### 1.1 Saves can write into the base game install

**Problem.** `resolveFile` ([src/main/pathResolver.ts:8](../src/main/pathResolver.ts)) falls back to the game path when the mod doesn't override a file. The folder resolver does the same per file. Every writer then saves to that resolved path:

- `map:save` → `project.resolvedPaths.definitions` ([mapHandlers.ts:16](../src/main/ipc/handlers/mapHandlers.ts))
- `saveBmp` → `project.resolvedPaths.provinces` ([ProjectSession.ts:94](../src/main/services/projects/ProjectSession.ts))
- `StatesTxtWriter` / `StrategicRegionsTxtWriter` → `sourcePath` ([StatesTxtWriter.ts:12](../src/main/parsers/StatesTxtWriter.ts), [StrategicRegionsTxtWriter.ts:7](../src/main/parsers/StrategicRegionsTxtWriter.ts))

Editing a vanilla state the mod doesn't override rewrites the file inside `steamapps/common/Hearts of Iron IV`.

**Fix.**
- Add a main-process `resolveWriteTarget(project, readPath)` that maps any read path to the same relative path under `modPath`. It must work for both game-origin and mod-origin files.
- Before the first write to a game-origin file, copy it into the mod folder (copy-on-write). Update `resolvedPaths` / `sourcePath` so later reads and watchers use the mod copy.
- Make every writer go through this function. Throw if a write target resolves outside `modPath`. That also closes part of item 3.3.
- Since `definition.csv` and `provinces.bmp` are single files, copying them in effectively makes the mod own the whole map. Show that in the UI ("Saving will create `map/definition.csv` in your mod").

### 1.2 State and strategic-region writers are lossy and corrupt script

**Problem.** The writers regenerate files from a narrow model. Vanilla round-trip results:

`history/states/1044 - Wuwei.txt`:

```text
# original (inside 1936.1.1)            # written
IF = {                                   IF = "{
    limit = { has_dlc = "..." }              limit = { has_dlc = "..." }
    GSM = { transfer_state = PREV }          ...
    add_core_of = GSM                    }"
}
                                         # and in base history:
                                         add_core_of = GSM   <- hoisted, now unconditional
```

`map/strategicregions/114-North Pacific.txt`:

```text
temperature={ -20.0 0.0 }   ->   temperature = { 20.0 0.0 }
naval_terrain=water_deep_ocean   ->   (dropped)
```

Root causes:

| Location | Bug | Vanilla impact |
|---|---|---|
| [StatesTxtWriter.ts:71](../src/main/parsers/StatesTxtWriter.ts) | Any value with whitespace gets quoted, including raw `{ ... }` blocks | 16 state files with `if` blocks |
| [StatesTxt.ts:41](../src/main/parsers/StatesTxt.ts) | `parseHistoryDef` runs over the whole `history` block, so owner, cores, VPs and buildings inside dated or `if` blocks are hoisted into base history | Many dated-history states |
| [StatesTxt.ts:56](../src/main/parsers/StatesTxt.ts) | Reads `is_impassable`; the real key is `impassable` | All 21 impassable states lose the flag |
| [StrategicRegionsTxt.ts:143](../src/main/parsers/StrategicRegionsTxt.ts) | Number regex `[\d.]+` drops the minus sign | 1,000 negative temperatures flip sign |
| [StrategicRegionsTxtWriter.ts](../src/main/parsers/StrategicRegionsTxtWriter.ts) | Only id, name, provinces and weather are written | `naval_terrain` (63), `static_modifiers` (10) dropped |
| All writers | Comments, formatting, key order and unknown keys are discarded | Every edited file |

**Fix.**
1. **Short term:** turn off state and strategic-region saving (hide the save bars or make them read-only) until 1.1 and the steps below land.
2. **Shared lossless parser:** build one Clausewitz/Paradox-script tokenizer and parser in `src/main/parsers/script/` that produces a syntax tree keeping comments, whitespace and original number text. Replace the six copies of `extractBlock`/`parseNamedBlocks` with it.
3. **Edit in place:** turn each domain edit (set owner, add/remove provinces, change a weather period) into a targeted change to the tree. Only touched nodes are re-emitted; everything else is written back byte-for-byte.
4. **Structured history:** model `history` as base entries plus dated blocks. Keep conditional or unknown blocks (`if`, `IF`, country-scoped blocks) as opaque nodes that are never flattened or quoted.
5. **Numbers:** parse numbers as signed (`-?\d+(\.\d+)?`) and keep the original text so `1.000` stays `1.000`.
6. **Tests:** add round-trip tests: parse → serialize with no edits must equal the input byte-for-byte for every vanilla state, strategic region and `definition.csv` line. Keep a few vanilla samples as fixtures.

### 1.3 Writers replace the whole file with a single object

**Problem.** `writeFileSync(sourcePath, serialize(oneObject))`. For a file holding several `state = {}` or `strategic_region = {}` blocks (common in mods), saving one deletes the rest. Saving two edited states from the same file keeps only the last one.

**Fix.** With the tree approach from 1.2, a save loads the file's tree, applies all edits aimed at that file, and writes once. Group save requests by target file in `ProjectLoader.saveStates` / `saveStrategicRegions`. Write atomically: write to `file.tmp`, then rename.

### 1.4 External `definition.csv` changes are ignored, then overwritten

**Problem.** The `definitions` change handler ([useMapLoader.ts:226](../src/renderer/src/ui/hooks/useMapLoader.ts)) refreshes `provinces` and the catalog but not `originalDefinitions`. Draft targets, validation and save are all built on `originalDefinitions`, so the next save writes the stale copy over the outside change. States and regions have a milder version of this: when the file changes on disk, pending edits (which replace whole fields) still apply on top without any conflict check.

**Fix.**
- Refresh `originalDefinitions` when definitions change on disk.
- When pending edits exist for changed data, raise a conflict notification ("definition.csv changed on disk — reload and drop edits / keep edits"). Don't silently merge.
- Record the file's hash at load. Before saving, compare it to the disk hash and refuse or ask on mismatch. `fileManager` already computes hashes; route saves through it.

---

## 2. Functional bugs (P1)

> **Status (2026-09-10): addressed (2.1–2.8).**
> - 2.1: `projectId` now comes from `useCoreStore`; BMP saves are explicit (a save bar in PaintPanel) and send a `Uint8Array` instead of a plain array.
> - 2.2: `revertBmpStroke` only reverts the newest stroke; repeating it walks strokes back one at a time.
> - 2.3: added `selectNextAvailableProvinceId` (`provinceEditSelectors.ts`), based on the highest ID actually in use rather than a count; `assignBmpProvince` also refuses an ID that's already taken.
> - 2.4: added `moveProvincesToState`/`moveProvincesToRegion`, which add a province to one state/region and remove it from whichever other one currently holds it, in the same store update.
> - 2.5: `App.tsx` switches views on `sessionStatus` instead of `projectPath`; a failed open shows the error on the selection screen instead of a broken editor, and no longer leaves an unhandled rejection.
> - 2.6: Back and window close both ask before discarding unsaved changes (`selectHasUnsavedChanges`, a native confirm dialog), and Back now disposes the project session instead of leaving it running.
> - 2.7: `ProjectSession`'s async loads and file-watcher reloads capture the project at the start and check it's still current before touching session state or emitting — a stale reply from a since-replaced project can no longer mislabel data or mark a new project as already loaded.
> - 2.8: ContinentTxt's comment bug was already fixed by 1.2's shared parser. Fixed here: `config.ts` deep-merges `paths` and compares structurally; `WorkerParsePool` now handles a worker exiting without an `error` event; macOS `activate` no longer opens a second window; `datasetSlice` dedupes `states`/`strategicRegions` by ID; `revertBmpReplacement` restores the province's pre-replacement edit instead of leaving the replacement's draft merged in.
> - Tests: `npm test`.

### 2.1 Paint-mode BMP save never runs

**Problem.** [MapCanvas.tsx:352](../src/renderer/src/ui/components/MapCanvas.tsx) reads `projectId` from `useMapDataStore`, but it lives in `useCoreStore`. It's always `undefined`, so `window.api.map.saveBmp` is never called and painted pixels are lost. `tsc` reports this. Even if it ran, it would:
- auto-save the whole map after every brush stroke, with no explicit save;
- send `Array.from(RGBA)` over IPC (~46M JS numbers for a 5632×2048 map);
- never re-save after a stroke revert.

**Fix.**
- Read `projectId` from `useCoreStore`.
- Replace auto-save with an explicit paint save bar, like the other modes, backed by `pendingBmpStrokes`.
- Change the contract to `saveBmp(projectId, rgba: Uint8Array, width, height)`. Electron copies typed arrays efficiently; avoid `number[]`.
- Once BMP saving is explicit, ship it together with the definitions save (new provinces need both files to agree), or at least warn when one is saved without the other.

### 2.2 Out-of-order stroke revert corrupts pixels; no undo

**Problem.** `PaintPanel` offers revert on any stroke ([PaintPanel.tsx:128](../src/renderer/src/ui/components/paintPanel/PaintPanel.tsx)). `MapRenderer.revertBrushStroke` writes back each pixel's `old*` colour even if a later stroke repainted that pixel. There's no Ctrl+Z / Ctrl+Y anywhere.

**Fix.** Allow reverting only the newest stroke, or reverting a stroke plus everything after it. Add a shared undo/redo stack (a command pattern over store actions) with keyboard shortcuts, covering paint strokes and field edits.

### 2.3 New province IDs can collide

**Problem.** `max(originalIds) + pendingNewProvinces.size + 1` ([MapCanvas.tsx:412](../src/renderer/src/ui/components/MapCanvas.tsx), [BmpAssignPopover.tsx:231](../src/renderer/src/ui/components/provincePanel/BmpAssignPopover.tsx)). With pending IDs `max+1` and `max+2`, reverting `max+1` makes the next allocation `max+2` again.

**Fix.** Add one `allocateProvinceId()` selector in `provinceEditSelectors.ts` returning `max(originalIds ∪ pendingNewProvinces.values()) + 1`, and use it in both places. `assignBmpProvince` should reject IDs that are already taken.

### 2.4 A province can end up in two states or two regions

**Problem.** Adding a province to a state ([StateDetailPanel.tsx:966](../src/renderer/src/ui/components/statePanel/StateDetailPanel.tsx)) or region ([StrategicRegionDetailPanel.tsx:293](../src/renderer/src/ui/components/strategicRegionPanel/StrategicRegionDetailPanel.tsx)) doesn't remove it from its previous owner and doesn't check that the ID exists. HOI4 errors on double membership. `stateProvinceToStateId` silently keeps whichever owner was added last.

**Fix.**
- Add store actions `moveProvincesToState(ids, stateId)` / `moveProvincesToRegion(ids, regionId)` that update both the source and the target in one step.
- Check that IDs exist in the effective province catalog. Warn when adding a sea province to a state.
- Add state/region validators (see 3.2).

### 2.5 A failed project open shows a broken editor

**Problem.** `openProjectStarted` sets `projectPath`, and `sessionFailed` keeps it. [App.tsx:54](../src/renderer/src/ui/app/App.tsx) shows the editor whenever `projectPath` is set, so a failed open renders the editor in the 480×600 window with no project loaded. `loadProject` also rethrows into an `onClick`, causing an unhandled rejection. `sessionStatus` and `sessionErrorMessage` aren't read anywhere in the UI.

**Fix.** Switch views on `sessionStatus` (`idle`/`error` → selection view; `project-open`/`loading-map`/`ready` → editor). On failure, clear `projectPath` and show `sessionErrorMessage` on the selection screen. Don't rethrow from UI handlers.

### 2.6 Back and close don't check unsaved changes or dispose the session

**Problem.**
- `handleBack` ([App.tsx:25](../src/renderer/src/ui/app/App.tsx)) clears renderer state without asking about unsaved changes.
- Closing the window doesn't ask either (no `beforeunload` / `close` handling).
- The main-process `ProjectSession` stays alive after Back, with its watchers and one worker thread per CPU core, until the next project opens.

**Fix.**
- Add a `selectHasUnsavedChanges` selector covering all four edit slices.
- Confirm before Back, and intercept window close in main (the renderer answers through IPC).
- Add a `projects:close` IPC call that runs `session.dispose()`, and call it on Back.

### 2.7 Stale async results can land in a new session

**Problem.** `ProjectSession.emit` ([ProjectSession.ts:246](../src/main/services/projects/ProjectSession.ts)) tags events with the *current* `projectId`. A load or flush still running from the old project can emit into the new one, and its `.then` can set `statesLoaded = true` for the new project.

**Fix.** Capture `const project = this.project` at the start of each async operation and pass it into `emit`. Drop results when `project !== this.project`. Or give each `open()` a generation counter.

### 2.8 Smaller bugs

| Location | Problem | Fix |
|---|---|---|
| [ContinentTxt.ts:21](../src/main/parsers/ContinentTxt.ts) | Words after `#` inside the braces become continents, shifting every position | Strip `#...` to end of line before tokenizing (or use the shared parser) |
| [config.ts:47](../src/main/config.ts) | Shallow merge: a partial `paths` override loses the other keys; `===` on objects always stores them | Deep-merge `paths` with the defaults; compare structurally |
| [WorkerParsePool.ts:77](../src/main/workers/WorkerParsePool.ts) | Only `error` is handled; a worker that exits without an error leaves its tasks pending forever | Handle `exit`: reject in-flight tasks and respawn |
| [index.ts:10](../src/main/index.ts) | macOS `activate` creates a new window even when one already exists | Check `BrowserWindow.getAllWindows().length === 0` |
| [datasetSlice.ts:68](../src/renderer/src/infra/store/slices/datasetSlice.ts) | `appendStates` keeps duplicate IDs in the `states` array (mod + game files defining the same ID) | Dedupe by ID, keeping the mod version |
| [provinceEditSlice.ts:123](../src/renderer/src/infra/store/slices/provinceEditSlice.ts) | `revertBmpReplacement` leaves the draft fields merged at assignment time | Keep the pre-assignment patch and restore it |

---

## 3. Structural and design gaps (P2)

### 3.1 Missing editing features

- States and strategic regions can't be created or deleted (the edit slices only patch existing IDs).
- Provinces can only be assigned to states or regions by typing IDs. Add "paint membership" tools on the map, reusing the existing click handling.
- `default.map` is resolved and checked but never parsed. `adjacencies.csv`, `buildings.txt` positions, supply nodes and railways aren't modelled.
- `descriptor.mod` dependencies (sub-mods) aren't followed when resolving paths.

### 3.2 Validation covers provinces only

- No state or region validators: province in zero or several states/regions, missing province IDs, empty states, unknown state category, sea provinces in states.
- `snapshot.continents` is available but never checked (land without a continent, sea with one).
- ID gaps each produce three misleading warnings ("missing type/terrain/colour"). Emit one `province.id-gap` error instead; HOI4 needs contiguous IDs.
- Validator messages are hardcoded English; send them through i18n keys.

**Fix.** Generalise `ProvinceValidator` into a `MapValidator` that receives a snapshot with provinces, states and regions. Run it in a worker (see 4.4).

### 3.3 The main process trusts renderer paths

`files:load` / `files:read` read any path the renderer sends. The states and regions writers write to any `sourcePath` the renderer supplies. `sandbox: false` ([window.ts:23](../src/main/window.ts)) and there's no CSP in `index.html`.

**Fix.** In main, keep `sourcePath` as an opaque ID the renderer can't change (for example, look it up from state ID in main). Restrict reads to `resolvedPaths` and writes to `modPath` (see 1.1). Turn on `sandbox: true` (the preload only uses `contextBridge`/`ipcRenderer`) and add a strict CSP.

### 3.4 File watching is incomplete

- The file list is fixed at `open()`, so new or deleted state/region files are never picked up. Watch directories instead.
- `stateCategories` and `buildings` change events are declared in `MapChangedEvent` but never sent; resources and weather aren't watched.
- The app's own saves trigger reloads. Only BMP saves are suppressed, through a counter that breaks if the watcher fires 0 or 2 times. Suppress by expected hash instead: record the hash of what was written and ignore change events that match it.

### 3.5 Each save bar is its own copy

`ProvincePanel`, `StateSaveBar` and `StrategicRegionSaveBar` each copy the save logic. There's no shared dirty-state, save-all or cross-file save.

**Fix.** Add a `saveService` that collects pending changes from every edit slice, plans the file writes (BMP + definitions + states + regions), runs them through one IPC call, and reports results together. That's also the natural place for the conflict and hash checks from 1.4.

---

## 4. Performance (P3)

### 4.1 Draft maps are rebuilt on every query

`MapQueryProvider` rebuilds `selectProvinceDraftTargetMaps` (O(provinces)) on every call ([MapQueryProvider.tsx:63](../src/renderer/src/bridge/MapQueryProvider.tsx)). It's called on every hover move ([useMapViewportState.ts:261](../src/renderer/src/ui/hooks/useMapViewportState.ts)) and for every candidate in `generateUniqueColor`.

**Fix.** Memoise on the store's input references (a module-level cache keyed by the six inputs), or have `useProvinceEditTargets` publish its memoised result for the query API to read.

### 4.2 Zoom stalls with many highlighted provinces

`mergeCollidingBboxGroups` ([useMapCanvas.ts:687](../src/renderer/src/ui/hooks/useMapCanvas.ts)) is roughly O(n³) and runs on every wheel tick for selection, warnings and errors.

**Fix.** Use a sweep-line or grid-bucket merge, run it only after zooming stops (debounce), and cap bounding-box drawing when groups exceed a few hundred.

### 4.3 `provinces.bmp` is copied many times

The file travels as base64 over IPC ([ProjectLoader.ts:73](../src/main/services/projects/ProjectLoader.ts)), is stored as a string in Zustand, rebuilt as a data URL, and decoded separately by the renderer, the analysis worker and `useOverlayAssets`.

**Fix.** Send a `Uint8Array` (or read it through a custom protocol), decode once, and share the decoded pixels and `ProvinceIndex`. Consider parsing BMP directly (24-bit BMP is simple) instead of `createImageBitmap` + canvas `getImageData`, which also rules out colour-management changes to province colours.

### 4.4 Validation runs twice per edit on the main thread

`useProvinceEditTargets` and `useProvinceValidation` each compute `selectEffectiveProvinceCatalog`, then validation runs synchronously.

**Fix.** Compute the effective catalog once (shared hook or store-derived value) and run validation in a Web Worker with a debounce.

### 4.5 Minor

- The painted-province index (bounding boxes, adjacency) goes stale after painting, so selection outlines drift. Update the affected bounding boxes as pixels are painted.
- The canvas ignores `devicePixelRatio`, so it looks blurry on HiDPI screens.
- WebGL context loss isn't handled.

---

## 5. Tooling and hygiene (P3)

### 5.1 The renderer has never been typechecked

`tsconfig.web.json` uses `paths` without `baseUrl`, so `tsc` fails before checking anything. With `baseUrl` added there are **53 errors**, including:
- imports of files that don't exist (`core/contracts/CoreState` in `Shell.tsx`; wrong-depth `../../../../shared/...` in `MapQueryProvider.tsx`);
- the `projectId` bug (2.1);
- a missing `OverlayPanelItem` import and an undefined `styles.pickerArea` in `MapModePanel.tsx`;
- `string | null` passed where `string` is expected throughout `useMapLoader.ts`.

The node project also has two real errors (`fileParseWorker.ts:48`, `provinceCatalog.ts:121`) plus some errors inside dependency type files.

**Fix.**
- Add `"baseUrl": "."` to `tsconfig.web.json` and `"skipLibCheck": true` to both configs.
- Add `"typecheck": "tsc -b"` and run it in `build`/CI.
- Fix the errors.

### 5.2 No tests or lint

**Fix.** Add Vitest. Priorities: parser round-trip tests (1.2), `provinceEditSelectors`, `datasetSlice`, `pathResolver` (including `replace_path`). Add ESLint with `@typescript-eslint` and `react-hooks`. Several effects already have incomplete or overly broad dependency lists.

### 5.3 Dead code (~1,100 lines)

Unreferenced: `ui/components/ProvinceList.tsx` (998 lines), `ui/hooks/useMapData.ts`, `ui/hooks/useTrackedFile.ts` (which leaves `infra/store/fileStore.ts` unused too), `ui/lib/animateValue.ts`, `MapRenderer.readPixel`, the `files:read` / `files:getHash` IPC paths, and the unused sync loaders in `ProjectLoader`. Delete them, or confirm they're planned.

### 5.4 Repo hygiene

- `tsconfig.web.tsbuildinfo` is committed; add `*.tsbuildinfo` to `.gitignore`.
- The six parsers each carry their own `extractBlock`; this goes away with the shared parser (1.2).
- A few hardcoded English strings: `"Expand detail panel"` (MapView), `` `Province ${id}` `` (MapCanvas), validator messages.

---

## Suggested order

1. **Stop the damage (P0):** write targets restricted to the mod folder with copy-on-write (1.1); turn off state and region saving (1.2, step 1); refresh `originalDefinitions` and add hash checks before save (1.4).
2. **Make it checkable:** fix the tsconfig, add a `typecheck` script, clear the errors (5.1). This also fixes the paint save (2.1).
3. **Lossless persistence:** shared script parser, in-place writers, per-file grouped atomic saves, round-trip tests against vanilla (1.2, 1.3, 5.2).
4. **Correctness:** ID allocator (2.3), single ownership for states and regions (2.4), session status handling and unsaved-change prompts (2.5, 2.6), stale-async guard (2.7).
5. **Paint rework:** explicit save, binary transfer, undo stack (2.1, 2.2).
6. **Structure and performance:** unified save service and validation (3.2, 3.5), directory watching (3.4), query memoisation and single BMP decode (4.x).
