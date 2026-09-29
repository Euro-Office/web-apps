# Euro Office — build system

> **For AI assistants:** This document is the authoritative source for the build pipeline.
> Read it in full before modifying any file under `build/`. Cross-reference
> `.claude/findings/` for known non-obvious issues. The invariants section is
> load-bearing — violations cause silent runtime failures.

Euro Office is an AGPL fork of OnlyOffice DocumentServer. This directory contains
the webpack 5 build system.

---

## Quick start

```bash
# In the eo container (or any machine with Node 20 + BUILD_ROOT set):
cd /develop/web-apps/build
PRODUCT_VERSION=9.2.1 BUILD_ROOT=/var/www/onlyoffice/documentserver THEME=euro-office \
  node scripts/build-pipeline.js
```

`make web-apps-dev` in the `eo` container calls the same pipeline via the
Makefile in `DocumentServer/develop/setup/`.

---

## Pipeline overview

A preflight audit, then five phases. Wall clock is dominated by webpack.

```
Preflight
  verify-replacements.mjs     fail early if load-bearing string-replace idioms drifted

Phase 1 — all in parallel
  deploy-sprites.js           generate SVG sprite sheets into source tree
  deploy-common.js            copy SDK, vendor JS, common HTML/SVG assets
  deploy-html.js              *.html.deploy → *.html, @@SRC_ROOT@@ replacement
  deploy-reporter.js          terser-minify presentationeditor/app.reporter.js
  deploy-embed.js             build embed (LESS + bundle + HTML) for 4 editors
  webpack ×6                  bundle app.js / code.js / app.css / locale per editor (desktop, Terser)
  mobile ×4                   framework7-react webpack builds into the SOURCE tree (word, cell, slide, visio; esbuild)

Phase 2 — mobile deploy
  deploy-mobile.js            copy mobile output (index.html → index.html + index_loader.html, dist/,
                              css/, locale/, resources/img/) from source tree → BUILD_ROOT for the 4
                              mobile editors. MUST precede deploy-theme-images' mobile img overlay.

Phase 3 — parallel
  deploy-resources.js         copy per-editor main/resources (needs sprites from phase 1)
  deploy-theme-images.js      overlay theme images (common + per-editor mobile)

Phase 4 — inline
  inline-svgs.js              inline SVG/script tags into built HTML (needs deploy-html + deploy-common)

Phase 5 — gates (fail the build loudly)
  verify-bundles.mjs          scan built bundles for surviving {{TOKEN}} literals
  verify-deploy.mjs           assert every required artifact exists (incl. mobile)
  verify-browser-target.mjs   no hardcoded browser targets; configs import build/browser-floor.mjs
```

---

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `PRODUCT_VERSION` | **yes** | — | e.g. `9.2.1`. Rejected if major < 6 (EuroOffice ≥ 6 gate). |
| `BUILD_ROOT` | **yes** | `../deploy` | Absolute path to DocumentServer output root. |
| `BUILD_NUMBER` | no | `GITHUB_RUN_NUMBER` → `common.json.build` | Appended to version string in JS bundles. Auto-increments in CI via `GITHUB_RUN_NUMBER`. |
| `THEME` | no | `euro-office` | Theme directory name under `theme/`. |
| `NODE_ENV` | no | `production` | Build mode, forced onto every child. `development` = unminified, `console` kept, esbuild minifier off for mobile (so the ES target + `drop_console` do NOT run — never validate a fix on a dev build). The pipeline echoes the resolved mode in its banner (green prod / red DEV warning). |
| `WATCH` | no | `0` | `1` = mobile webpack watch mode (live rebuild). Decoupled from `NODE_ENV`; for direct `build.js` runs only — the pipeline would hang on a watching child. |
| `APP_COPYRIGHT` | no | auto | Copyright line in JS preamble. |
| `COEDITING_DESKTOP` | no | Russian default | Help page token. |
| `PLUGIN_LINK` | no | onlyoffice.com URL | Help page token. |
| `PLUGIN_LINK_MACROS` | no | onlyoffice.com URL | Help page token. |

---

## Script reference

All scripts live in `build/scripts/`. Run from `build/` with `node scripts/<name>.js`.

### `build-pipeline.js`
Orchestrator. Resolves env vars, validates `PRODUCT_VERSION`, determines `BUILD_NUMBER`
from `GITHUB_RUN_NUMBER` or `common.json.build`, forces `NODE_ENV` (default `production`)
onto every child, then runs the preflight + five phases (see Pipeline overview).
Echoes the resolved build mode in its banner. Each step is prefixed in stdout; summary
table with per-step timing at end.

### `deploy-common.js`
Copies SDK assets (sdkjs), api.js (with
`{{PRODUCT_VERSION}}` token replacement), apps-common (HTML, SVGs, images),
and vendor scripts (jQuery, socket.io, xregexp, underscore, iscroll, fetch,
es6-promise, requirejs-terser, common-embed, monaco).

**Requires `PRODUCT_VERSION`** — used in api.js which EuroOffice checks at load time.

### `deploy-html.js`
Copies `*.html.deploy` → `*.html` for all 6 editor dirs (5 editors/main +
documenteditor/forms), replacing `@@SRC_ROOT@@` with the repo root path.
Must run before `inline-svgs.js`.

### `deploy-resources.js`
Per-editor `main/resources/` copy for all 5 desktop editors:
- Help files (`resources/help/**`)
- Non-locale localisation (watermark, numbering, symboltable, formula-lang)
- Images — rasters via sharp, SVGs via svgo, `.ico` plain copy
- spreadsheeteditor: sdkjs cursor files
- `replace:prepareHelp` token replacement in deployed `help/ru/**/*.htm*`

**Must run after `sprites.sh`** (sprites write into the source img dir).

### `deploy-reporter.js`
Terser-minifies `apps/presentationeditor/main/app.reporter.js` with the
copyright preamble (`mangle: false`). The reporter
HTML is handled by `deploy-html.js`; SVG inlining by `inline-svgs.js`.

### `inline-svgs.js`
Inlines `<inline src="*.svg"/>` and
`<script src="*?__inline=true">` tags in all built HTML files.
**Must run after `deploy-html.js` and `deploy-common.js`** — both regenerate
HTML from `.html.deploy` templates. Running this script alone after only
`deploy-common.js` will break the PDF viewer (`listenApiMsg is not defined`).

Hard-fails (exit 1) if zero substitutions per editor — strong guard against
a silently broken template or missing deploy-html run.

### `deploy-theme-images.js`
Copies `theme/{THEME}/assets/img/**` to common + per-editor mobile dirs,
and conditionally copies the embed logo.

### `deploy-embed.js`
For each of 4 editors: clean embed dir,
bundle JS (terser concat), compile LESS, copy locale + HTML, replace
`@@SRC_ROOT@@`, inline `?__inline=true` scripts.

### `deploy-mobile.js`
Phase 2. The mobile webpack (framework7-react) builds into the **source tree**
(`apps/<editor>/mobile/`), not `BUILD_ROOT`. This copies the output to
`BUILD_ROOT/web-apps/apps/<editor>/mobile/` for the 4 mobile editors:
`index.html` → `index.html` + `index_loader.html`, `dist/`, `css/`, `locale/`,
`resources/img/`. Soft-skips an editor with no built `index.html`.
**Must run before `deploy-theme-images`** (both write `mobile/resources/img/`;
theme images win the overlay). Its absence shipped mobile with only `resources/`
(404) — closes #258.

### Gate scripts (`verify-*.mjs`)
Preflight + Phase 5. Fail the build loudly rather than ship a silent defect:
- `verify-replacements.mjs` — preflight: source-side string-replace idiom audit.
- `verify-bundles.mjs` — scans built bundles for surviving `{{TOKEN}}` literals.
- `verify-deploy.mjs` — asserts every required artifact exists (vendor/embed/main/forms;
  mobile `index.html`/`dist`/`css`/`locale`).
- `verify-browser-target.mjs` — fails if any webpack/babel/postcss config hardcodes a
  browser target instead of importing from `build/browser-floor.mjs`.

### `browser-floor.mjs` (config, not a script)
Single source of truth for the mobile browser floor — `BROWSERSLIST` + `ESBUILD_TARGET`
at **ES2022** (Nextcloud floor: iOS 17 / Safari 17; Android 9 = updatable WebView).
Imported by the mobile `webpack.config.js` (esbuild target), `babel.config.js`, and
`postcss.config.js`. Setting a target anywhere else is rejected by
`verify-browser-target.mjs`. See `.claude/findings/mobile-i18next-esbuild-es2015.md`.

### `lib/build-utils.js`
Shared helpers used by all scripts above. Key exports:
- `SVGO_CONFIG` — load-bearing: `removeHiddenElems:false`, `cleanupIds:false`
- `optimizeImages(src, dest, {rastersOnly, svgOnly, exclude})` — sharp + svgo + ico copy
- `globToRegex(glob)` — converts a glob to regex (`*` → `[^/]*`, `**` → `.*`)
- `copyDirFiltered(src, dest, {include, exclude})` — filtered recursive copy
- `replaceTokensIn(dir, pairs, {exts})` — in-place token replacement

---

## Webpack configs

| Config | Editor | Notes |
|---|---|---|
| `webpack.documenteditor.mjs` | Document | |
| `webpack.spreadsheeteditor.mjs` | Spreadsheet | |
| `webpack.presentationeditor.mjs` | Presentation | Includes reporter view assets |
| `webpack.visioeditor.mjs` | Visio | |
| `webpack.pdfeditor.mjs` | PDF | |
| `webpack.forms.mjs` | Forms (doc subpath) | `editorConfig('documenteditor', {subpath:'forms'})` |

All configs are thin wrappers around `webpack.editor.factory.mjs`. The factory
handles: AMD module compatibility, LESS compilation, theme token replacement
via `build/theme.config.mjs`, `CopyWebpackPlugin` for locale, and `TerserPlugin`
for minification (desktop default `NODE_ENV || 'production'`).

**Mobile is a separate webpack build** in `vendor/framework7-react/build/webpack.config.js`
(not the factory). It uses `EsbuildPlugin` for minify + transpile, targets ES2022 via
`build/browser-floor.mjs`, and defaults `NODE_ENV` to `development` — the pipeline forces
`production` (see `NODE_ENV` in the env table). It writes to the **source tree**, then
`deploy-mobile.js` copies to `BUILD_ROOT`.

### Theme contract (`build/theme.config.mjs`)
Single source of truth for all brand/token substitution:
- `themeReplacements()` — `{{TOKEN}}` → value pairs for string-replace-loader
- `themeDefines()` — webpack DefinePlugin constants
- `themeGlobalVars()` — LESS global variables (all editors)
- `themeFormVars()` — LESS global variables (forms only)

**Do not duplicate token tables elsewhere.**

---

## Invariants — read before changing anything

These are non-obvious constraints that caused real failures during development.
Violating them causes silent runtime errors that only appear in the browser.

1. **Pipeline isolation** — never run `deploy-common.js` alone against a live
   `BUILD_ROOT` without completing the full pipeline through `inline-svgs.js`.
   `deploy-common.js` regenerates `apps/common/index.html` from the template
   but does NOT inline `?__inline=true` tags. Running it alone breaks the
   PDF viewer.

2. **`output.clean: false`** in all webpack configs. webpack and the deploy
   scripts both write into `BUILD_ROOT`. If webpack cleaned the output dir,
   it would delete files written by the deploy scripts. Do not set `output.clean: true`.

3. **SVGO config is load-bearing** — `removeHiddenElems: false` and
   `cleanupIds: false` in `SVGO_CONFIG` in `lib/build-utils.js`. The SVG
   icons use hidden elements and shared IDs for animation/state. Changing
   these options silently breaks icon rendering.

4. **Service worker aggressively caches** — always test in incognito or
   force-clear SW in devtools. Two `app.js` versions in devtools = cache conflict.

5. **`mangle: false` in TerserPlugin** — the codebase uses dynamic property
   access (`window['Common']`, `obj['method']()`) and `var Common = Common || {}`
   namespace guards that break with identifier renaming. Do not enable mangling
   without validating every editor in the browser.

6. **`BUILD_NUMBER` comes from `GITHUB_RUN_NUMBER` in CI** — not from
   `common.json.build`. The value in `common.json` is a static fallback for
   local dev. CI runs will have an incrementing build number automatically.

---

## Known issues (non-blocking)

| Issue | Location | Notes |
|---|---|---|
| `dark-logo_s.svg` / `warnings_s.svg` 404 | All editors | CSS relative path depth mismatch. Pre-existing. |
| `themes_thumbnail@2x.png` 404 | All editors | `sdkjs/common/Images/` — outside web-apps scope. |
| Transitions icon panel blank | presentationeditor | `btn-transition-*` CSS class template not updated for SVG migration. See `.claude/icon-migration.md`. |
| `FormsTab.getView()` throw on plain PDF | pdfeditor | Pre-existing upstream bug; SDK error handler catches it. |
| `device_scale.js` not found | inline-svgs warn | Malformed path in template; warns and skips. |

---

## Future improvements

### 1. Webpack filesystem cache ✓ done
`cache: { type: 'filesystem' }` is set in `webpack.editor.factory.mjs` — all
six configs inherit it. After the first full build, incremental webpack runs
take ~3–5s. Cache lives in `node_modules/.cache/webpack/` and invalidates
automatically when source or config changes.

### 2. CI: call `build-pipeline.js` directly ✓ done
The e2e workflow and the bake Dockerfile both invoke `node scripts/build-pipeline.js`
directly; env-var validation lives in the orchestrator.

### 3. Makefile update (DocumentServer repo) ✓ done
`develop/setup/Makefile` calls `build-pipeline.js`. Follow-up tracked in
Euro-Office/DocumentServer#259: split into explicit `web-apps` / `web-apps-prod` /
`web-apps-dev` (mode-in-recipe) targets so the build mode can't be flipped silently
by the shell environment.

### 4. esbuild vs TerserPlugin — desktop deferred, **mobile switched**
**Mobile already uses `EsbuildPlugin`** (`vendor/framework7-react/build/webpack.config.js`).
Note the sharp edge it caused: esbuild downlevels syntax to its `target`, and an
`es2015` target mis-compiled i18next 25's class internals (`we is not a function`) —
fixed by targeting ES2022 via `browser-floor.mjs`. Desktop is still deferred:

esbuild is a Go-based JS minifier 10–100× faster than terser, via `esbuild-loader`'s
`EsbuildPlugin`. This would cut desktop webpack time substantially.

**Why we have not switched desktop:**

Our TerserPlugin config uses `mangle: false`. This is intentional and
load-bearing. The codebase contains patterns that break with any identifier
renaming:
- `var Common = Common || {}` namespace guards (117 files)
- `window['Common']` and `window['AscDesktopEditor']` dynamic property access
- Backbone/Underscore extend chains that rely on constructor names

esbuild's closest equivalent is `keepNames: true`, which preserves function and
class names but still renames local variables. This is NOT equivalent to
`mangle: false`. A switch would require auditing every editor in the browser
to confirm no silent breakage — a significant testing surface with no automated
coverage.

If this is revisited: test `esbuild-loader` on `webpack.visioeditor.mjs` alone
first (smallest bundle, ~26s). Run the editor fully (open a file, check
toolbars, check JS console) before rolling out to other editors. The diff
between terser output and esbuild output on the same source would identify
any problematic transformations.

---

## Technical findings index

Detailed write-ups for non-obvious issues discovered during the migration.
**Read the relevant finding before debugging any runtime failure** — these took
significant debugging to diagnose.

| File | Problem |
|---|---|
| `.claude/findings/webpack5-var-common-scoping.md` | `var Common` namespace guard fails in webpack factory (117 files) |
| `.claude/findings/webpack5-locale-amd-parser-crash.md` | `locale.js` crashes webpack AMD parser during build |
| `.claude/findings/webpack5-keymaster-umd-guard.md` | `keymaster.js` ReferenceError + `window.key` never set |
| `.claude/findings/webpack5-toplevel-var-constants.md` | `var c_*` constants outside `define()` invisible as globals (~30 consumers) |
| `.claude/findings/webpack5-backbone-underscore-safe.md` | Backbone/Underscore are SAFE — do not add fixes for them |
| `.claude/findings/webpack5-bare-common-global-contract.md` | 58 files use bare `Common.*` — load-order invariant |
| `.claude/findings/deploy-html-inline-ordering.md` | `deploy-html.js` must run before `inline-svgs.js` |
| `.claude/findings/deploy-common-bugs.md` | Three bugs fixed in deploy-common.js: PRODUCT_VERSION, @@SRC_ROOT@@, inline coverage |
| `.claude/findings/phase-e-gap3-deploy-resources.md` | Per-editor `main/resources` deploy — design decisions + advisor review notes |
