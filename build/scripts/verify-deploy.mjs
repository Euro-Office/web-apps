#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
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

if (failed) {
    console.error('verify-deploy: FAILED — missing or empty deployed artifacts');
    process.exit(1);
}

console.log('verify-deploy: all checks passed');
