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
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
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

// Theme branding tokens (issue #89) — mirrors grunt replace:indexhtml. Env vars override
// theme config.json; logo paths resolve to the header logos deploy-theme-images overwrites.
const THEME = process.env.THEME || 'default';
let themeMeta = {};
{
    const cfg = path.join(REPO_ROOT, 'theme', THEME, 'meta', 'config.json');
    if (fs.existsSync(cfg)) {
        try { themeMeta = JSON.parse(fs.readFileSync(cfg, 'utf8')); }
        catch (e) { console.warn(`deploy-html: bad theme config ${cfg}: ${e.message}`); }
    }
}
const tv = (envVal, key, def) => (envVal != null && envVal !== '') ? envVal : (key in themeMeta ? themeMeta[key] : def);
const HEADER_IMG = '../../common/main/resources/img/header/';
const TOKENS = {
    APP_TITLE_TEXT:   tv(process.env.APP_TITLE_TEXT, 'app_title', 'ONLYOFFICE'),
    LOADER_LOGO:      HEADER_IMG + (themeMeta.loader_logo || 'dark-logo_s.svg'),
    LOADER_LOGO_DARK: HEADER_IMG + (themeMeta.loader_logo_dark || 'header-logo_s.svg'),
};

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
        let replaced   = content.replace(/@@SRC_ROOT@@/g, SRC_ROOT);
        for (const [k, v] of Object.entries(TOKENS)) replaced = replaced.split(`{{${k}}}`).join(v);
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
