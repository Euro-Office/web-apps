#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

'use strict';

// Gap 3: per-editor main/resources copy — replaces the resource-copying portion
// of grunt's deploy-app-main task for all five desktop editors.
//
// Covers: help, non-locale localization (symboltable, watermark, numbering,
//         formula-lang), per-editor img (rasters + SVGs, sharp+svgo optimised),
//         spreadsheeteditor sdkjs cursor files, and prepareHelp token replacement.
//
// Does NOT cover: locale/ (webpack CopyWebpackPlugin), app.js/code.js/app.css
//                 (webpack factory), json-minify (intentionally dropped — gzip
//                 handles size; cosmetic only).
//
// Run from web-apps/build/:
//   BUILD_ROOT=/var/www/... node scripts/deploy-resources.js
//
// BUILD_ROOT must be set. COEDITING_DESKTOP, PLUGIN_LINK, PLUGIN_LINK_MACROS
// are optional env vars (help token replacements); defaults match grunt.

const fs   = require('fs');
const path = require('path');
const {
    copyDirFiltered, replaceTokensIn, optimizeImages,
} = require('./lib/build-utils');

const REPO_ROOT  = path.resolve(__dirname, '..', '..');
const BUILD_DIR  = path.join(REPO_ROOT, 'build');   // grunt's cwd; JSON paths are relative to here
const SDKJS_ROOT = path.resolve(REPO_ROOT, '..', 'sdkjs');
const BUILD_ROOT = process.env.BUILD_ROOT;

if (!BUILD_ROOT) {
    console.error('deploy-resources: BUILD_ROOT must be set');
    process.exit(1);
}

const BUILD_OUT = path.join(BUILD_ROOT, 'web-apps');

const EDITORS = [
    'documenteditor',
    'spreadsheeteditor',
    'presentationeditor',
    'visioeditor',
    'pdfeditor',
];

// Mirrors grunt's _encode() + fallback semantics: encode env var then fall back
// to the raw (un-encoded) default string if the var is absent.
function _encode(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const HELP_REPLACEMENTS = [
    [/\{\{COEDITING_DESKTOP\}\}/g,  _encode(process.env.COEDITING_DESKTOP)  || 'Подключиться к облаку'],
    [/\{\{PLUGIN_LINK\}\}/g,        _encode(process.env.PLUGIN_LINK)        || 'https://api.onlyoffice.com/plugin/basic'],
    [/\{\{PLUGIN_LINK_MACROS\}\}/g, _encode(process.env.PLUGIN_LINK_MACROS) || 'https://api.onlyoffice.com/plugin/macros'],
];

// Resolve a cwd-relative JSON path (../apps/...) to an absolute path.
// grunt's cwd is build/, so all paths in the editor JSONs are relative to build/.
function resolveCwd(cwd) {
    return path.resolve(BUILD_DIR, cwd);
}

// Replace $BUILD_ROOT literal in a dest string from the editor JSON.
function resolveDest(dest) {
    return dest.replace('$BUILD_ROOT', BUILD_ROOT);
}

// Parse a grunt src array into { include, exclude } for copyDirFiltered.
// Grunt prefix "!" means exclude; everything else is include.
// A lone ["**"] include (= include all) is normalised to undefined so
// copyDirFiltered uses its default (no include filter = include all).
function parseSrc(src) {
    const arr     = Array.isArray(src) ? src : [src];
    const include = arr.filter(s => !s.startsWith('!')).map(s => s);
    const exclude = arr.filter(s =>  s.startsWith('!')).map(s => s.slice(1));
    return {
        include: (include.length === 1 && include[0] === '**') ? undefined : include,
        exclude: exclude.length ? exclude : undefined,
    };
}

// ---- per-editor tasks -------------------------------------------------------

async function deployEditorResources(editorName) {
    const cfg     = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, `${editorName}.json`), 'utf8'));
    const copy    = (cfg.main && cfg.main.copy) || {};
    const editorOut = path.join(BUILD_OUT, 'apps', editorName, 'main');

    // 1. Help copy (grunt copy:help)
    //    src: apps/<editor>/main/resources/help/**  excl *_/** and **/src/**
    const helpEntries = Array.isArray(copy.help) ? copy.help : (copy.help ? [copy.help] : []);
    for (const entry of helpEntries) {
        const src  = resolveCwd(entry.cwd);
        const dest = resolveDest(entry.dest);
        if (!fs.existsSync(src)) continue;
        const { include, exclude } = parseSrc(entry.src);
        copyDirFiltered(src, dest, { include, exclude });
    }

    // 2. Non-locale localization copy (grunt copy:localization, skipping locale/ entries)
    //    Locale files are handled by webpack CopyWebpackPlugin.
    //    Covers: watermark, numbering, symboltable, formula-lang (editor-dependent).
    //    entry.src is "*" (top-level flat dirs) — matchesAny("*") is non-recursive.
    const locEntries = Array.isArray(copy.localization) ? copy.localization : (copy.localization ? [copy.localization] : []);
    for (const entry of locEntries) {
        const cwd = entry.cwd;
        // locale/ dirs are handled by webpack — skip them
        if (/\/locale\/?$/.test(cwd)) continue;
        const src  = resolveCwd(cwd);
        const dest = resolveDest(entry.dest);
        if (!fs.existsSync(src)) continue;
        const { include, exclude } = parseSrc(entry.src);
        copyDirFiltered(src, dest, { include, exclude });
    }

    // 3. Images: rasters (sharp) + SVGs (svgo), same source, same exclusion
    //    grunt imagemin.images-app + svgmin (svgicons.common)
    //    images-common (merging common rasters into per-editor img) is dead config
    //    in the Gruntfile (commented out at line ~622) — not reproduced here.
    const imgSrc  = path.join(REPO_ROOT, 'apps', editorName, 'main', 'resources', 'img');
    const imgDest = path.join(editorOut, 'resources', 'img');
    if (fs.existsSync(imgSrc)) {
        await optimizeImages(imgSrc, imgDest, { exclude: ['toolbar/**/*x/**/*'] });
    }

    // 4. spreadsheeteditor only: sdkjs cursor files (grunt imagemin.images-common first entry)
    if (editorName === 'spreadsheeteditor') {
        const curSrc  = path.join(SDKJS_ROOT, 'word', 'Images');
        const curDest = path.join(editorOut, 'Images');
        if (fs.existsSync(curSrc)) {
            copyDirFiltered(curSrc, curDest, { include: ['**/*.cur'] });
        }
    }

    // 5. prepareHelp: token replacement in deployed help/ru/**/*.htm* (grunt replace:prepareHelp)
    //    Runs after help copy so the BUILD_ROOT files are in place.
    //    Only three tokens apply — indexhtml replacements are commented out in Gruntfile:686-688.
    const helpRuDir = path.join(editorOut, 'resources', 'help', 'ru');
    if (fs.existsSync(helpRuDir)) {
        replaceTokensIn(helpRuDir, HELP_REPLACEMENTS, { exts: ['.htm', '.html'] });
    }

    console.log(`deploy-resources: ${editorName} done`);
}

// ---- main -------------------------------------------------------------------

(async () => {
    for (const editor of EDITORS) {
        await deployEditorResources(editor);
    }
    console.log('deploy-resources: all editors done');
})().catch(err => {
    console.error('deploy-resources failed:', err.message || err);
    process.exit(1);
});
