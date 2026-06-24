# webpack migration reference

Grunt + r.js replaced by webpack 5 + Node.js scripts across all desktop editors.
Branch: `build/webpack-migration`. Merged: 2026-06-15.

---

## What changed

**Before**: Grunt orchestrated everything — AMD bundling via r.js, asset copy, HTML processing, minification, theme substitution, sprite generation.

**After**: Six webpack configs (one per editor) handle JS/CSS bundling. Six Node.js scripts handle everything else. A parallel orchestrator (`build/scripts/build-pipeline.js`) replaces the sequential Makefile chain.

**CI time**: ~7 minutes → ~2 minutes (cold runner) — speedup comes from webpack's faster bundling vs r.js, plus `build-pipeline.js` running all Phase 1 tasks in parallel. **Local (eo container, SKIP_MOBILE=1, cold cache)**: ~101s.

**Editors covered**: documenteditor, spreadsheeteditor, presentationeditor, visioeditor, pdfeditor, forms.

---

## Running the build

```bash
# In the eo container, from web-apps/build/
PRODUCT_VERSION=9.2.1 BUILD_ROOT=/var/www/onlyoffice/documentserver THEME=euro-office node scripts/build-pipeline.js

# Or via Makefile — invoke inside the eo container from the host:
docker exec eo make web-apps
docker exec eo make web-apps-dev              # incremental (node_modules must exist)
docker exec eo make web-apps-dev SKIP_MOBILE=1
```

`PRODUCT_VERSION` is required and must match the SDK version (see gotcha #1 below).

For container setup (docker-compose, volume mounts, the macOS branch-switch/stale-mount gotcha) see `DocumentServer/develop/setup/`.

---

## Pipeline overview

```
Phase 1 (all parallel):
  sprites.sh
  deploy-common       vendor scripts, API, SDK assets, apps-common HTML
  deploy-html         *.html.deploy → *.html, @@SRC_ROOT@@ substitution
  deploy-reporter     presentation reporter view minification
  deploy-theme-img    brand/theme image copy
  deploy-embed        embed API builds
  webpack ×6          JS + CSS bundles for each editor
  mobile ×4           framework7-react builds (word, cell, slide, visio)

Phase 2 (after Phase 1):
  deploy-resources    per-editor help, images, symboltable, watermark
  inline-svgs         replaces <inline src="...svg"/> and ?__inline=true in HTML
```

The ordering invariant: `deploy-html` must complete before `inline-svgs` runs. Never run `deploy-html` in isolation against a live `BUILD_ROOT` without following it with `inline-svgs` — you will get broken editors. See gotcha #5.

---

## Theme overrides

Theme-specific LESS lives entirely in `theme/euro-office/assets/less/`. The build compiles it into each editor's CSS bundle automatically — no build changes are needed when adding new overrides.

### How it works

```
theme/euro-office/assets/less/
  theme.less          ← entry: brand variables + @import "overrides.less"
  overrides.less      ← @import each override file
  overrides/
    header.less       ← per-editor header logo rules (data-editor-type selectors)
    about.less        ← about dialog logo
```

At build time, `theme.config.mjs` writes a one-line redirector stub:

```
apps/common/main/resources/less/_theme-main.less
  → @import "../../../../../theme/euro-office/assets/less/theme.less";
```

Each editor's `app.less` ends with `@import "../../../../common/main/resources/less/_theme-main.less";`. This pulls theme variables and overrides into the same LESS compilation scope, so theme variables get last-write-wins precedence over upstream defaults.

The stub is a redirector (not a copy) so that `theme.less`'s own relative `@import "overrides.less"` resolves from the theme directory. `_theme-main.less` is gitignored — it is generated on every build.

### Adding a new theme override

1. Create `theme/euro-office/assets/less/overrides/<name>.less`
2. Add `@import "overrides/<name>";` to `theme/euro-office/assets/less/overrides.less`
3. Done — no changes to `build/` or `apps/` required

### CSS output path

webpack outputs CSS to `apps/<editor>/main/app.css` (root of the editor `main/` directory), matching grunt's baseline. `url()` references in LESS are relative to this file, so `../../common/main/resources/img/…` resolves correctly. The MiniCssExtractPlugin filename is `[name].css` (not `resources/css/[name].css`).

---

## Gotchas

These took significant debugging to find. Read before touching the build.

### 1. `PRODUCT_VERSION` must be ≥ 6

EuroOffice rejects editors reporting a version below 6. The fallback in `common.json` is `4.3.0`. Always set `PRODUCT_VERSION` explicitly. The pipeline will fail fast if it's missing or too low.

### 2. `mangle: false` is not optional

117 source files use `var Common = Common || {}` as a namespace guard. Webpack's module factory changes the scoping so the guard never fires — name mangling then silently breaks `Common.*` access across the entire editor. `mangle: false` in `webpack.editor.factory.mjs` is load-bearing. Do not remove it without first auditing all `var Common` patterns.

### 3. `locale.js` crashes webpack's AMD parser

The locale files use an AMD `define()` pattern that trips webpack's built-in AMD parser. Fixed with `string-replace-loader` rewriting the pattern before webpack sees it. Do not use `noParse` — it was tried and breaks more than it fixes.

### 4. `keymaster.js` UMD guard

`keymaster.js` uses `this` as the UMD global context. In webpack's strict-mode module scope, `this` is `undefined`. The guard never sets `window.key`. Fixed via an alias to a patched copy.

### 5. SVG sprites are baked into the HTML at build time

Deployed HTML comes from `index.html.deploy` (not `index.html`). It uses `<inline src="...svg"/>` tags that `inline-svgs.js` replaces with raw SVG content. The deployed page has no network requests for icon files — they are embedded. There is no SVGInjector at runtime. If you see `<img class="inline-svg">` in page source, you are looking at the un-built source file.

### 6. `deploy-html` + `inline-svgs` are a unit

Running `deploy-html.js` alone regenerates HTML from `.html.deploy` templates but leaves `?__inline=true` script tags as broken filesystem paths. This produces "Not supported version" / blank pages across all editors. Always run `inline-svgs.js` immediately after any `deploy-html.js` run.

### 7. `apps/common/` must be included in inline-svgs scope

The common `index.html` also has inline tags. If `inline-svgs.js` only covers editor dirs, the PDF viewer breaks (`listenApiMsg is not defined`) — a subtle failure with a non-obvious cause.

### 8. Service worker caches aggressively

Always test in incognito or disable the SW in DevTools → Application → Service Workers. Stale `app.js` from a previous build will persist invisibly. Two `app.js` entries in DevTools Sources = cache conflict.

**Why incognito is needed locally (not in production):** The production server 302-redirects every asset through a version-prefixed URL (`/<PRODUCT_VERSION>-<cache_tag>/…`), and `cache_tag` is a fresh random hash per deploy (`documentserver-flush-cache.sh`). Real production deploys self-bust the SW with no manual action.

Locally, the `eo` Makefile pins `PRODUCT_VERSION` from a static `VERSION` file. A local `make web-apps` rebuild emits a new `app.js` at the **same URL** — same version prefix, no `cache_tag` change — so the SW recognises the path as a known asset and serves the previous (stale) bundle from its cache.

Fix: run `documentserver-flush-cache.sh` inside the container after a local rebuild, or use incognito for the test session.

### 9. `output.clean: false` is intentional — do not enable code-splitting without also addressing stale chunks

All six webpack configs share a single `BUILD_ROOT`. Setting `clean: true` would wipe sibling editors' output. Leave it false.

This is safe **only because the output set is fixed**: each editor always emits exactly `app.js`, `app.css`, and `locale/*`. Do not enable `splitChunks`, dynamic `import()`, or `asyncChunks` without adding per-editor output cleaning or content-hashed filenames. A build that stops emitting a chunk would leave the old file on disk; the SW would cache it under the live version prefix and serve stale code silently.

---

## Known issues (pre-existing, not caused by migration)

| Issue | Notes |
|-------|-------|
| `warnings_s.svg` 404 | CSS `url()` path — pre-existing in all editors |
| `themes_thumbnail@2x.png` 404 | In `sdkjs/common/Images/` — outside web-apps scope |
| Transitions panel icons blank | `btn-transition-*` CSS classes not updated for SVG sprite migration |
| `FormsTab.getView()` throws on plain PDF | Pre-existing OnlyOffice upstream bug — SDK error handler catches it |

---

## Build system improvements — 2026-06-17

Three follow-up changes on top of the Phase E work. All committed to `build/webpack-migration` and validated with two full pipeline runs in the `eo` container.

### EsbuildPlugin replaces TerserPlugin + CssMinimizerPlugin (closes #107)

**Why:** Mobile webpack builds were bottlenecked on Terser JS minification + cssnano CSS minification running as two separate passes in `optimization.minimizer`. esbuild processes both in a single native pass — roughly 10× faster than Terser at minification.

**What:** `vendor/framework7-react/build/webpack.config.js` — the two-entry minimizer array and the duplicate `CssMinimizerPlugin` in the production plugins block are replaced with:

```js
minimizer: [new EsbuildPlugin({ target: 'es2015', css: true })]
```

`terser-webpack-plugin` and `css-minimizer-webpack-plugin` removed from `package.json`; `esbuild-loader ^4.0.0` added.

**npm install runs inside the `eo` container** (`/develop/web-apps/vendor/framework7-react`), not on the host — the directory is mounted from the Docker volume.

**Measured results (two full pipeline runs, eo container):**

| Task | Before | Run 1 | Run 2 |
|------|--------|-------|-------|
| mobile:word | 146–179s | 130.4s | 132.9s |
| mobile:cell | 146–179s | 127.2s | 130.8s |
| mobile:slide | 146–179s | 122.5s | 126.1s |
| mobile:visio | 146–179s | 101.4s | 116.2s |
| Wall clock | — | 176.9s | 164.0s |

Run-to-run variance of ~10s is normal (Docker CPU scheduling, page cache). Both runs fully green.

**CSS minification note:** esbuild's CSS minifier is structurally simpler than cssnano — it does not do advanced cross-rule merging, shorthand collapsing, or `z-index` rebasing. In practice the output is correct and slightly larger. If a CSS bundle grows materially after this change, esbuild is the reason; it is acceptable.

**What was not changed (deferred):** Replacing `babel-loader` with `esbuild-loader` for JS *transforms* (not just minification) would save a further ~30–50s per editor. Deferred because the mobile code uses MobX `@inject` legacy class decorators (`experimentalDecorators: true` required), and the decorator transform is the one thing worth a dedicated tested commit rather than bundling into this change. Key facts for when this is revisited:
- Only *class-level* `@inject` decorators are used — no property/accessor decorators exist in the mobile source
- MobX uses `makeObservable(this, {...})` runtime API in stores (MobX 6), not `@observable` field decorators
- esbuild `experimentalDecorators: true` implements TypeScript legacy decorator semantics — same as babel `legacy: true` — and is sufficient for `@inject`
- Switch JSX to `jsx: 'automatic'` as a separate commit from the loader swap, so any failure has a known cause

### Lazy task spawn + word-wrapped phase task list

**Why:** `task()` previously spawned child processes eagerly when the spec was created. `phase1Tasks` (deploy ×5 + webpack ×6) was built eagerly, then `mobile:install` was awaited (~20s), then `phase()` was called. Result: the phase banner and task list were printed *after* the fast deploy tasks had already run and printed their ✓ lines — completion before header. Confusing and misleading.

**What:** `task()` now returns a lazy spec `{label, cmd, args, opts}`. `runTask(spec)` does the spawn and returns `{promise, kill, label}`. `phase()` prints its banner and task list, *then* calls `runTask()` on each spec. Output order is now always correct. Task list is also word-wrapped at 80 columns with ` · ` separators instead of one long comma-joined line.

### Flush stderr of killed tasks on sibling failure

**Why:** When a phase task fails, `phase()` sends SIGTERM to all sibling processes. Killed tasks' buffered stderr was discarded — if the killed task had begun emitting a useful error before being killed, that output was silently lost.

**What:** One line added to `runTask()`: `stderrBuf` is flushed in the `signal` branch of `child.on('exit')`, matching the existing flush in the non-zero exit branch. Diagnostic output from a killed task is now visible.

### CI: build.yml switched from sequential steps to build-pipeline.js (2026-06-18)

**Why:** `build.yml` previously ran 12 individual sequential steps (sprites, deploy-*, webpack ×6, mobile ×4, verify ×2) with bash `&` parallelism only within the webpack and mobile steps. This didn't realise the full Phase 1 fan-out that `build-pipeline.js` provides, and duplicated the orchestration logic. The e2e workflow was already using `build-pipeline.js` directly.

**What:** The 12 steps collapsed into three:

1. `npm install` — unchanged
2. `Merge translations` — kept as a separate step (not in the pipeline)
3. `Build web-apps` — `node scripts/build-pipeline.js` with `BUILD_ROOT`, `THEME`, `PRODUCT_VERSION` in env

`PRODUCT_VERSION` guard, `BUILD_NUMBER` resolution, and `BUILD_ROOT` defaulting all move inside the pipeline. `BUILD_ROOT` is set explicitly to `${{ github.workspace }}/web-apps/deploy` rather than computed in shell.

The Tier-1 gates (verify-replacements preflight + verify-bundles/verify-deploy final gate) are now part of every CI run via the pipeline, rather than being separate steps that could be skipped or reordered.

---

## Tracked follow-ups

- [#106](https://github.com/Euro-Office/web-apps/issues/106) — Replace grunt-inline SVG/script embedding with cached external assets (duplicate copyright headers, no independent caching)
- [#107](https://github.com/Euro-Office/web-apps/issues/107) — Evaluate esbuild as TerserPlugin replacement for mobile builds ✅ resolved 2026-06-17

---

## Files added by the migration

| File | Purpose |
|------|---------|
| `build/webpack.{editor}.mjs` | Per-editor webpack config (6 files) |
| `build/webpack.editor.factory.mjs` | Shared config factory |
| `build/theme.config.mjs` | Brand token substitution — single source of truth |
| `build/scripts/build-pipeline.js` | Parallel build orchestrator |
| `build/scripts/deploy-common.js` | Vendor scripts, API, SDK assets, apps-common HTML |
| `build/scripts/deploy-html.js` | HTML template deployment |
| `build/scripts/inline-svgs.js` | Build-time SVG/script inlining |
| `build/scripts/deploy-resources.js` | Per-editor resource copy |
| `build/scripts/deploy-reporter.js` | Presentation reporter view |
| `build/scripts/deploy-theme-images.js` | Theme/brand images |
| `build/scripts/deploy-embed.js` | Embed API builds |
| `build/scripts/lib/build-utils.js` | Shared helpers |

---

*Developed with Claude Code (Anthropic) — AI-assisted analysis, debugging, and implementation.*
