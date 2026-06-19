# Clausewitz Map Editor

A desktop editor for **Clausewitz** game map mods. As of presently, it opens a HOI4 mod (or the base
game files), reads the map-related game data, and lets you inspect and edit it against a
live, hardware-accelerated view of the province bitmap.

## Domain

A HOI4 map is defined by a set of plain-text and bitmap files that must stay mutually
consistent. The editor models that domain and surfaces the inconsistencies:

- **Provinces** — the atomic unit. Each province has an `id`, an RGB `color`, a `type`
  (land/sea/lake), a coastal flag, a `terrain`, and a `continent`. Definitions live in
  `definition.csv`; the actual province shapes live as coloured regions in
  `provinces.bmp`.
- **Province catalog** — the reconciliation of two sources of truth: what `definition.csv`
  *says* exists vs. what colours actually appear in `provinces.bmp`. The catalog flags
  colours present in the bitmap but missing from the CSV (and vice-versa), which is the
  central correctness problem in HOI4 map modding.
- **States & Strategic Regions** — higher-level groupings of provinces, with their own
  definition files, buildings, resources, and categories.
- **Terrain & Continents** — the lookup tables provinces reference.

The shared domain interfaces (catalog, editing, validation, and the IPC contract) are
documented with diagrams in [`docs/province-model.md`](docs/province-model.md). Past,
deleted experiments are recorded in [`docs/archived-branches.md`](docs/archived-branches.md).

## Design

An **Electron** app built with **electron-vite**, split across the three standard
processes with a typed boundary between them:

- **Main process** (`src/main/`) — owns all disk access and game-file parsing. It locates
  game/mod paths (`pathResolver`, `pathVerifier`, `gamePath`), manages open projects
  (`services/projects/`), and parses/writes each game file through a dedicated parser in
  `parsers/` (`DefinitionsCsv`, `ContinentTxt`, `StatesTxt`, `StrategicRegionsTxt`,
  `BmpWriter`, …). Heavy parsing runs off the UI thread in a worker pool
  (`workers/WorkerParsePool`). It watches files on disk and pushes change events back to
  the renderer.
- **Preload** (`src/preload/`) — exposes the main-process API to the renderer over a
  `contextBridge`, with no direct Node access leaking into the UI.
- **Renderer** (`src/renderer/src/`) — a **React 18** UI styled with **Fluent UI**
  (`@fluentui/react-components`). State is held in **Zustand** slices under
  `infra/store/slices/` (province/state/strategic-region/bmp editing, selection, session,
  display mode). The map itself is drawn by a **WebGL** renderer
  (`infra/lib/MapRenderer.ts`, using `gl-matrix`) that recolours the province texture and
  paints selection/validation highlights; large data tables are virtualized with
  `@tanstack/react-virtual`. UI is organized into views (`ui/views/`: project selection,
  map, settings) with logic factored into hooks (`ui/hooks/`).
- **Shared contract** (`src/shared/`) — the single source of truth for the types crossing
  the IPC boundary (`contract/api.ts`, `contract/events.ts`, `mapDataTypes.ts`,
  `provinceCatalog.ts`, `provinceValidation.ts`). Both processes import from here, so the
  API stays type-checked end to end.

Data flow: the renderer calls `api.map.load(projectId)` → main parses the project and
returns a `MapDataSnapshot` → the renderer builds the catalog, renders the bitmap, and
runs validators → edits are collected as pending changes and written back via
`api.map.save` / `saveStates` / `saveStrategicRegions` / `saveBmp`.

## Running the project

Prerequisites: **Node.js 18+** and npm.

```bash
npm install        # install dependencies

npm run dev        # launch the app in development (electron-vite, with HMR)
npm run dev:inspect  # same, with the main-process debugger attached
```

Build and package:

```bash
npm run build      # type-check + build main/preload/renderer into out/
npm run preview    # run the production build locally
npm run package    # build + produce a distributable installer via electron-builder
```

On first launch the app asks you to point it at your HOI4 game folder and/or a mod folder;
recently opened projects are remembered for next time.
