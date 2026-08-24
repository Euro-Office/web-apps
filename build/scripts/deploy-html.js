#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

'use strict';

// Gap 1: replaces grunt's copy:indexhtml + replace:indexhtml steps.
// Copies *.html.deploy → *.html for each editor and substitutes @@SRC_ROOT@@.
// Does NOT clean destination dirs — those dirs contain webpack bundles, locale
// files, and CSS that other pipeline steps own.
//
// Run from web-apps/build/ once grunt is removed (Phase E), BEFORE inline-svgs.js:
//   BUILD_ROOT=/var/www/... node scripts/deploy-html.js
//
// apps/common/*.html.deploy is handled by deploy-common.js, not this script.

const fs   = require('fs');
const path = require('path');

const REPO_ROOT  = path.resolve(__dirname, '..', '..');
const BUILD_ROOT = process.env.BUILD_ROOT;

if (!BUILD_ROOT) {
    console.error('deploy-html: BUILD_ROOT must be set');
    process.exit(1);
}

const SRC_ROOT = REPO_ROOT;
const APPS_SRC = path.join(REPO_ROOT, 'apps');
const APPS_OUT = path.join(BUILD_ROOT, 'web-apps', 'apps');

const DIRS = [
    { editor: 'documenteditor',     subpath: 'main'  },
    { editor: 'spreadsheeteditor',  subpath: 'main'  },
    { editor: 'presentationeditor', subpath: 'main'  },
    { editor: 'pdfeditor',          subpath: 'main'  },
    { editor: 'visioeditor',        subpath: 'main'  },
    { editor: 'documenteditor',     subpath: 'forms' },
];

let totalCopied = 0;

for (const { editor, subpath } of DIRS) {
    const srcDir  = path.join(APPS_SRC, editor, subpath);
    const destDir = path.join(APPS_OUT, editor, subpath);

    if (!fs.existsSync(srcDir)) {
        console.warn(`deploy-html: no source dir ${srcDir} — skipping`);
        continue;
    }

    const deploys = fs.readdirSync(srcDir).filter(f => f.endsWith('.html.deploy'));

    if (deploys.length === 0) {
        console.error(`deploy-html: no *.html.deploy files in ${srcDir}`);
        process.exitCode = 1;
        continue;
    }

    fs.mkdirSync(destDir, { recursive: true });

    for (const filename of deploys) {
        const content  = fs.readFileSync(path.join(srcDir, filename), 'utf8');
        const replaced = content.replace(/@@SRC_ROOT@@/g, SRC_ROOT);
        const destName = filename.replace('.html.deploy', '.html');
        fs.writeFileSync(path.join(destDir, destName), replaced, 'utf8');
    }

    totalCopied += deploys.length;
    console.log(`deploy-html: ${editor}/${subpath} — ${deploys.length} file${deploys.length !== 1 ? 's' : ''}`);
}

if (process.exitCode === 1) {
    process.exit(1);
}

console.log(`deploy-html: done — ${totalCopied} file${totalCopied !== 1 ? 's' : ''} total`);
