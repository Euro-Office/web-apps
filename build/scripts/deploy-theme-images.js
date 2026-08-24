#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

'use strict';

// Replaces grunt's deploy-theme-images task.
// Copies theme images into BUILD_ROOT, overwriting stock versions.
//
// Run after grunt (and after inline-svgs.js):
//   THEME=euro-office node scripts/deploy-theme-images.js
//
// Soft-skips (exit 0) if the theme img directory does not exist — supports
// local dev where the theme repo may be absent.

const fs   = require('fs');
const path = require('path');

const REPO_ROOT  = path.resolve(__dirname, '..', '..');
const BUILD_ROOT = process.env.BUILD_ROOT
    ? path.resolve(process.env.BUILD_ROOT)
    : path.resolve(REPO_ROOT, 'deploy');
const THEME      = process.env.THEME || 'euro-office';

const IMG_SRC = path.join(REPO_ROOT, 'theme', THEME, 'assets', 'img');

const EDITORS = [
    'documenteditor',
    'spreadsheeteditor',
    'presentationeditor',
    'visioeditor',
];

const APPS_OUT = path.join(BUILD_ROOT, 'web-apps', 'apps');

if (!fs.existsSync(IMG_SRC)) {
    console.log(`deploy-theme-images: no theme images at ${IMG_SRC} — skipping`);
    process.exit(0);
}

function copyRecursive(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath  = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

const dests = [
    path.join(APPS_OUT, 'common', 'main',   'resources', 'img'),
    path.join(APPS_OUT, 'common', 'mobile', 'resources', 'img'),
    ...EDITORS.map(e => path.join(APPS_OUT, e, 'mobile', 'resources', 'img')),
];

for (const dest of dests) {
    copyRecursive(IMG_SRC, dest);
}

// Embed logo — optional, only if present in the theme
const embedLogo = path.join(IMG_SRC, 'embed', 'logo.svg');
if (fs.existsSync(embedLogo)) {
    for (const editor of EDITORS) {
        const logoDir = path.join(APPS_OUT, editor, 'embed', 'resources', 'img');
        fs.mkdirSync(logoDir, { recursive: true });
        fs.copyFileSync(embedLogo, path.join(logoDir, 'logo.svg'));
    }
    console.log('deploy-theme-images: embed logo deployed');
}

console.log(`deploy-theme-images: theme images deployed to ${BUILD_ROOT}`);
