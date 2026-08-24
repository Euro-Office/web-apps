#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

'use strict';

// Replaces grunt's deploy-app-mobile task for the four mobile editors.
//
// Copies mobile build output from the source tree to BUILD_ROOT:
//   index.html → index.html + index_loader.html (api.js:1176 routes custom-loader
//               non-desktop clients to index_loader.html — same content, live path)
//   dist/**    → dist/     (built JS + source maps)
//   css/*.css  → css/      (stylesheets only — no CSS maps, matches grunt)
//   locale/*   → locale/   (committed locale source)
//   resources/img/** → resources/img/   (per-editor mobile images)
//   apps/common/mobile/resources/img/** → resources/img/  (common mobile images)
//   apps/common/main/resources/img/about/** → resources/img/about/
//
// Run after Phase 1 (mobile webpack builds), before deploy-theme-images (which
// overlays theme images onto the same resources/img/ paths — deploy-theme-images
// must win, so deploy-mobile runs first).
//
// Copy-merge only — never wipes the destination. BUILD_ROOT must be set.
// Fails loudly if any editor's mobile/index.html is absent: in the pipeline all
// four mobile editors always build, so a miss means a failed/killed build, not a
// legitimate skip — better to fail here than let Phases 3-5 run on a partial deploy.

const fs   = require('fs');
const path = require('path');
const { copyDir, copyDirFiltered } = require('./lib/build-utils');

const REPO_ROOT  = path.resolve(__dirname, '..', '..');
const BUILD_ROOT = process.env.BUILD_ROOT;

if (!BUILD_ROOT) {
    console.error('deploy-mobile: BUILD_ROOT must be set');
    process.exit(1);
}

const APPS_SRC = path.join(REPO_ROOT, 'apps');
const APPS_OUT = path.join(BUILD_ROOT, 'web-apps', 'apps');

const MOBILE_EDITORS = [
    'documenteditor',
    'spreadsheeteditor',
    'presentationeditor',
    'visioeditor',
];

function deployEditor(editor) {
    const src  = path.join(APPS_SRC, editor, 'mobile');
    const dest = path.join(APPS_OUT, editor, 'mobile');

    fs.mkdirSync(dest, { recursive: true });

    // index.html → both index.html and index_loader.html
    fs.copyFileSync(path.join(src, 'index.html'), path.join(dest, 'index.html'));
    fs.copyFileSync(path.join(src, 'index.html'), path.join(dest, 'index_loader.html'));

    // dist/** — built JS and source maps
    const distSrc = path.join(src, 'dist');
    if (fs.existsSync(distSrc)) copyDir(distSrc, path.join(dest, 'dist'));

    // css/*.css — stylesheets only, no source maps
    const cssSrc = path.join(src, 'css');
    if (fs.existsSync(cssSrc)) {
        copyDirFiltered(cssSrc, path.join(dest, 'css'), { include: ['*.css'] });
    }

    // locale/* — committed source files
    const localeSrc = path.join(src, 'locale');
    if (fs.existsSync(localeSrc)) copyDir(localeSrc, path.join(dest, 'locale'));

    // resources/img/** — per-editor mobile images
    const imgSrc = path.join(src, 'resources', 'img');
    if (fs.existsSync(imgSrc)) copyDir(imgSrc, path.join(dest, 'resources', 'img'));

    // apps/common/mobile/resources/img/** — shared mobile images
    const commonMobileImg = path.join(APPS_SRC, 'common', 'mobile', 'resources', 'img');
    if (fs.existsSync(commonMobileImg)) copyDir(commonMobileImg, path.join(dest, 'resources', 'img'));

    // apps/common/main/resources/img/about/** — about images
    const aboutSrc = path.join(APPS_SRC, 'common', 'main', 'resources', 'img', 'about');
    if (fs.existsSync(aboutSrc)) copyDir(aboutSrc, path.join(dest, 'resources', 'img', 'about'));

    console.log(`deploy-mobile: ${editor} done`);
}

let missing = false;
for (const editor of MOBILE_EDITORS) {
    if (!fs.existsSync(path.join(APPS_SRC, editor, 'mobile', 'index.html'))) {
        console.error(`deploy-mobile: ${editor} — mobile/index.html missing (build failed or was killed)`);
        missing = true;
        continue;
    }
    deployEditor(editor);
}

if (missing) {
    console.error('deploy-mobile: FAILED — expected mobile output missing; not deploying a partial build');
    process.exit(1);
}

console.log('deploy-mobile: all editors done');
