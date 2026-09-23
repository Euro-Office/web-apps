#!/usr/bin/env node
/**
 * (c) Copyright Ascensio System SIA 2010-2024
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 */

/**
 * Check C — required-output manifest.
 *
 * Asserts every expected deployed artifact exists and is non-empty.
 * Guards against:
 *   - A vendor file whose upstream source path moved (deploy-common's copyFile
 *     silently no-ops on a missing src → file never appears in BUILD_ROOT).
 *   - An editor whose webpack or embed build silently produced nothing.
 *
 * Run AFTER webpack + deploy steps (BUILD_ROOT must be set).
 * Exit 0 with a summary per artifact on success.
 * Exit 1 naming any missing or empty artifact on failure.
 *
 * NOTE: does NOT catch upstream additions to embed bundles — that is a
 * merge-time review item (diff each <editor>.json embed.js.src against
 * upstream after a sync).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { VENDORS } from '../vendor.manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BUILD_ROOT = process.env.BUILD_ROOT
    ? path.resolve(process.env.BUILD_ROOT)
    : path.resolve(__dirname, '../../deploy');

const BUILD_OUT = path.join(BUILD_ROOT, 'web-apps');

const EDITORS        = ['documenteditor', 'spreadsheeteditor', 'presentationeditor', 'visioeditor', 'pdfeditor'];
const EMBED_EDITORS  = ['documenteditor', 'spreadsheeteditor', 'presentationeditor', 'visioeditor'];
const MOBILE_EDITORS = ['documenteditor', 'spreadsheeteditor', 'presentationeditor', 'visioeditor'];

let failed = false;

function checkFile(rel) {
    const abs = path.join(BUILD_OUT, rel);
    if (!fs.existsSync(abs)) {
        console.error(`verify-deploy: MISSING      ${rel}`);
        failed = true;
        return;
    }
    if (fs.statSync(abs).size === 0) {
        console.error(`verify-deploy: EMPTY        ${rel}`);
        failed = true;
        return;
    }
    console.log(`verify-deploy: ok           ${rel}`);
}

function checkDir(rel) {
    const abs = path.join(BUILD_OUT, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
        console.error(`verify-deploy: MISSING_DIR  ${rel}/`);
        failed = true;
        return;
    }
    if (fs.readdirSync(abs).length === 0) {
        console.error(`verify-deploy: EMPTY_DIR    ${rel}/`);
        failed = true;
        return;
    }
    console.log(`verify-deploy: ok           ${rel}/`);
}

// ---- vendor artifacts (from vendor.manifest.mjs) ----------------------------
for (const v of VENDORS) {
    if (v.dir) checkDir(v.dest);
    else       checkFile(v.dest);
}

// ---- embed bundles (4 editors; pdfeditor has no embed) ----------------------
for (const ed of EMBED_EDITORS) {
    checkFile(`apps/${ed}/embed/app-all.js`);
}

// ---- main bundles (6 editors) -----------------------------------------------
for (const ed of EDITORS) {
    checkFile(`apps/${ed}/main/app.js`);
    checkFile(`apps/${ed}/main/code.js`);
}

// ---- forms ------------------------------------------------------------------
checkFile('apps/documenteditor/forms/app.js');
checkFile('apps/documenteditor/forms/code.js');

// ---- mobile -------------------------------------------------------------
for (const ed of MOBILE_EDITORS) {
    const base = `apps/${ed}/mobile`;
    checkFile(`${base}/index.html`);
    checkFile(`${base}/index_loader.html`);
    checkFile(`${base}/dist/js/app.js`);   // stable unhashed JS entry — checkDir alone would pass on a chunk/.map-only dist
    checkDir(`${base}/dist`);
    checkDir(`${base}/css`);
    // framework7 stylesheets are CopyWebpackPlugin static copies loaded via a JS
    // load_stylesheet() call, not a <link href> — invisible to the href scan below,
    // and checkDir passes on any CSS file. Assert them explicitly.
    checkFile(`${base}/css/framework7.css`);
    checkFile(`${base}/css/framework7-rtl.css`);
    checkDir(`${base}/locale`);
    // Defense-in-depth: assert the hashed CSS href in index.html actually exists.
    // CSS is contenthash-named (parse the href); the JS entry is the stable
    // dist/js/app.js asserted above.
    const indexAbs = path.join(BUILD_OUT, base, 'index.html');
    if (fs.existsSync(indexAbs)) {
        const html = fs.readFileSync(indexAbs, 'utf8');
        for (const [, ref] of html.matchAll(/href="(css\/[^"]+\.css)"/g)) {
            checkFile(`${base}/${ref}`);
        }
    }
}

// ---- inline residue -----------------------------------------------------
// inline-svgs.js and deploy-embed.js both silently warn-and-leave-tag when a
// ?__inline=true script's source can't be resolved (see inline-svgs.js SCRIPT_RE
// handling), so a broken inline path ships to production without failing the
// build. Walk the HTML these two scripts are actually responsible for and
// fail on any such tag — except the one known, expected case:
// sdkjs/common/device_scale.js. sdkjs is built as a separate bake target and
// is never present in the web-apps image at the point this pipeline runs, so
// that tag can never inline here; it is resolved by the browser at runtime
// instead, via the deployed page's own URL and nginx's sdkjs alias (see
// apps/spreadsheeteditor/main/index.html.deploy). Anything else surviving in
// these dirs is a real regression and must fail the build.
//
// Scoped to inline-svgs.js's DIRS + deploy-embed.js's EDITORS (main/forms/
// common/embed) rather than all of BUILD_OUT: apps/api/documents/*.html
// (cache-scripts.html, preload.html) also carry an @@SRC_ROOT@@ ?__inline=true
// tag, but that directory was dropped from DIRS when inline-svgs.js replaced
// grunt-inline (grunt did process it — see git history), so the tag has
// silently survived, unresolved, into shipped HTML ever since. That's a live
// bug (preload.html is loaded at runtime by DocsAPI.DocEditor.warmUp,
// apps/api/documents/api.js), not a benign gap — tracked separately, not
// fixed here; this scope only avoids failing THIS check on it.
const EXPECTED_UNRESOLVED_INLINE = /^\.\.(?:\/\.\.){3}\/sdkjs\/common\/device_scale\.js\?__inline=true$/;

const INLINE_MANAGED_DIRS = [
    'documenteditor/main', 'documenteditor/forms', 'documenteditor/embed',
    'spreadsheeteditor/main', 'spreadsheeteditor/embed',
    'presentationeditor/main', 'presentationeditor/embed',
    'pdfeditor/main',
    'visioeditor/main', 'visioeditor/embed',
    'common',
];

function findHtmlFiles(dir) {
    let out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) out = out.concat(findHtmlFiles(abs));
        else if (entry.name.endsWith('.html')) out.push(abs);
    }
    return out;
}

for (const rel of INLINE_MANAGED_DIRS) {
    const dir = path.join(BUILD_OUT, 'apps', rel);
    if (!fs.existsSync(dir)) continue;
    for (const abs of findHtmlFiles(dir)) {
        const html = fs.readFileSync(abs, 'utf8');
        for (const match of html.matchAll(/<script[^>]+src=["']([^"']*\?__inline=true)["'][^>]*>/g)) {
            const src = match[1];
            if (EXPECTED_UNRESOLVED_INLINE.test(src)) {
                console.log(`verify-deploy: ok (runtime-resolved) ${path.relative(BUILD_OUT, abs)} — ${src}`);
                continue;
            }
            console.error(`verify-deploy: INLINE_RESIDUE ${path.relative(BUILD_OUT, abs)} — unresolved ${src}`);
            failed = true;
        }
    }
}

if (failed) {
    console.error('verify-deploy: FAILED — missing or empty deployed artifacts');
    process.exit(1);
}

console.log('verify-deploy: all checks passed');
