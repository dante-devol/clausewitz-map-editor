# Archived branches

A record of branches that were deleted after review, so the ideas in them aren't lost.
The code itself was **not** kept — these branches were either superseded by `main` or
written against a structurally different version of the app.

## `claude/affectionate-keller` (deleted 2026-06-19)

An early, standalone prototype that branched directly off the initial commit and never
shared `main`'s current architecture. By the time it was reviewed it was 84 commits
behind `main`, and `main` had been rebuilt as a TypeScript app under `src/renderer/src/`,
so none of this branch's files existed in `main`. It was deleted without merging because
re-integrating it would have conflicted with essentially the entire current codebase.

Kept here purely as a feature/idea reference in case any of it is worth re-implementing
against the current `src/renderer/` UI.

### What it was

A self-contained **Electron 28 + React 18 (JSX) + Vite 5** translation of the original
tkinter "Province Definition Checker & Editor" Python tool. Package name
`province-definition-checker`. Only runtime dependency was `@tanstack/react-virtual`.

File layout (all under a flat `src/`, not `src/renderer/`):

```
electron/main.js          IPC: file dialogs, raw read/write file
electron/preload.js       contextBridge API surface
src/App.jsx               root state; derived mismatch lists (missingFromMap/missingFromCsv)
src/components/ReconcileTab.jsx    two-panel OLD/NEW reconciliation
src/components/DefsTable.jsx       definitions table: sortable cols, multi-select, inline edit
src/components/ReassignDialog.jsx  modal for keep/adopt metadata on reassignment
src/components/FilePicker.jsx      file picker primitive
src/components/StatBadge.jsx       stat badge primitive
src/services/csvService.js         pure parseCsv() / formatCsv() (no IPC)
src/services/mapService.js         loadMapColors() via Canvas API (renderer-side)
src/index.css                      dark purple theme
```

### Notable features / ideas

- **Reconciliation workflow** — two-panel OLD/NEW view with Reassign, "Add as New",
  and "Delete from CSV" actions; panel headers show a `· N selected` count.
- **Batch reassign** — select N old + N new and reassign all at once; pairs matched by
  list order, one uniform keep/adopt metadata choice, applied in a single state pass
  (`O(pairs)` Map lookup). `ReassignDialog` shows a scrollable pair table for batches > 1.
- **Multi-cell selection + copy/paste** — column-range selection via shift+click
  (anchor preserved), Ctrl+C copies the first selected cell, Ctrl+V bulk-pastes into all
  selected cells in one state update with type/bool validation, Escape clears. Toolbar
  shows an "N terrain cells selected" badge.
- **Single-click inline editing** — `<select>` for Type/Bool; Terrain/Region show a ▾
  chevron that opens a combobox; shared pre-computed `<datalist>` elements rendered once
  outside the virtualized tables for instant dropdown open regardless of dataset size.
- **Table virtualization** — `@tanstack/react-virtual` (padding-row technique) on
  `DefsTable` and both `ReconcileTab` panels; smooth on 10k+ row datasets.
- **RGB swatch column** — single RGB column with a colour swatch + value.

### The one genuinely hard-won bug fix worth remembering

**BMP colour analysis.** The naive approaches produced ~31k phantom colour differences:

1. `jimp` was dropped entirely — its colour-space pipeline rewrote pixel values.
2. `createImageBitmap({ colorSpaceConversion: 'none' })` + Canvas `drawImage` *also*
   failed: tagging the bitmap as having no colour profile made Chromium apply a
   linear→sRGB transform when compositing onto an sRGB canvas, again rewriting pixels.
3. **Fix:** a direct BMP byte parser reading raw BGR bytes (like PIL does), handling
   24-bit and 32-bit uncompressed formats with correct row-stride padding and
   top-down/bottom-up orientation. Canvas fallback kept for PNG/JPEG (without the
   `colorSpaceConversion` flag).

If `main` ever does pixel-exact BMP colour comparison, this is the gotcha to know about.

## `claude/vigorous-margulis-a484d3` (deleted 2026-06-19)

Superseded — nothing unique remained. Its headline work, *"replace CoreSession with
Zustand slices"*, had already independently landed in `main` (which now has
`infra/store/coreStore.ts` + the full `infra/store/slices/` set and no `CoreSession`/
`core/contracts/`). Its one real bug fix, *"highlights lost after image reload"*, is also
already present in `main` at `src/renderer/src/ui/hooks/useMapCanvas.ts` (the
`setHighlightColors` / `setValidationHighlightColors` calls right after `loadImage`).

## `codex/display-mode-overlay-controls` (deleted 2026-06-19)

Nothing to keep — its tip was already an ancestor of `main` (fully merged).
