#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Check E — sprite coverage per deploy template.
 *
 * Every toolbar and menu icon is drawn by Button.js's templateBtnIcon as
 * <svg><use href="#btn-…"></svg>. The symbol it points at has to be in a sprite
 * that the page inlines with an <inline src="….svg" /> tag. When a page lacks
 * one of those tags, nothing fails: the icons are just blank (see #277 for
 * index_internal.html.deploy and #286 for index_loader.html.deploy).
 *
 * For each apps/<editor>/{main,embed,forms}/*.html.deploy this check
 *   1. finds the page's AMD entry (require(['app']) or data-main="app"),
 *   2. follows its define()/require() module ids through the source tree —
 *      the same graph webpack bundles,
 *   3. collects the icon ids those modules request, extracting them from each
 *      iconCls literal exactly as templateBtnIcon does (/btn-[^\s]+/; an
 *      iconCls with "svgicon" takes the other branch and is skipped), and
 *   4. fails if any id is not a <symbol> in a sprite the page inlines.
 *
 * Pages without an AMD entry (embed, which loads a prebuilt app-all.js) are
 * skipped. Pages that inline no sprite at all but whose modules request icons
 * are reported as NO_SPRITES without failing: they use the svg-icon CSS class
 * instead, and whether the shared components that request icons are ever
 * shown there is a question for the page's owner, not this check.
 *
 * Runs in the gates phase, after deploy-sprites.js has regenerated the
 * per-editor toolbar/icons.svg in the source tree. It reads only the source
 * tree, so it can also be run on its own: node scripts/verify-sprites.mjs
 *
 * Exit 0 with a summary per page on success.
 * Exit 1 naming each page, missing icon id and requesting module on failure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPS = path.resolve(__dirname, '../../apps');

const EDITORS  = ['documenteditor', 'spreadsheeteditor', 'presentationeditor', 'visioeditor', 'pdfeditor'];
const SUBPATHS = ['main', 'embed', 'forms'];

// Icons requested by a shared view that only renders them in some editors.
// The view is bundled everywhere, but the button is created or shown behind a
// runtime condition that only some editors' Main.js can make true, so the
// other editors' sprites rightly leave the symbol out. Keyed by icon id; the
// value lists the editors whose pages must define it. Anything not listed here
// is required on every page whose modules request it. When adding an entry,
// name the condition and where it is set.
const EDITOR_GATED = {
    // common/main/lib/view/ReviewChanges.js: appConfig.canReview,
    // canFeatureComparison, canViewReview and canUseMailMerge are only set by
    // documenteditor/main/app/controller/Main.js
    'btn-review-save':      ['documenteditor'],
    'btn-review-deny':      ['documenteditor'],
    'btn-combine':          ['documenteditor'],
    'btn-big-ic-review':    ['documenteditor'],
    'btn-ic-reviewview':    ['documenteditor'],
    'btn-mailmerge':        ['documenteditor'],
    // common/main/lib/view/Header.js: config.canRequestFillingStatus is only
    // set by documenteditor/main/app/controller/Main.js
    'btn-filling-status':   ['documenteditor'],
    // common/main/lib/view/SearchPanel.js: the redact button is only shown
    // when mode.isPDFEdit
    'btn-find-redacted':    ['pdfeditor'],
    // common/main/lib/view/Protection.js: behind `if (0 && …)`, never created
    'btn-restrict-editing': [],
};

const rel = abs => path.relative(APPS, abs).split(path.sep).join('/');

// Comments are stripped so that commented-out buttons (e.g. the show/hide
// details buttons in spreadsheeteditor's DataTab.js) don't count. The line
// comment pattern leaves "://" alone so URLs inside strings survive.
function stripComments(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

const sourceCache = new Map();
function source(file) {
    if (!sourceCache.has(file)) sourceCache.set(file, stripComments(fs.readFileSync(file, 'utf8')));
    return sourceCache.get(file);
}

// Module ids are resolved against apps/ (the require.config baseUrl of every
// editor) or, when relative, against the requiring file. text!-templates and
// ids that map outside apps/ (vendor, sdkjs, path aliases) are not followed:
// none of them create buttons.
function resolveModule(id, fromFile) {
    if (id.startsWith('text!')) return null;
    const base = id.startsWith('.') ? path.resolve(path.dirname(fromFile), id) : path.join(APPS, id);
    const file = base.endsWith('.js') ? base : base + '.js';
    if (!file.startsWith(APPS + path.sep)) return null;
    return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

function moduleGraph(entry) {
    const seen = new Set([entry]);
    const stack = [entry];
    while (stack.length) {
        const file = stack.pop();
        for (const [, , id] of source(file).matchAll(/(['"])((?:\.{1,2}\/|[a-z]+\/)[\w./-]+)\1/g)) {
            const dep = resolveModule(id, file);
            if (dep && !seen.has(dep)) {
                seen.add(dep);
                stack.push(dep);
            }
        }
    }
    return [...seen];
}

// icon id -> modules that request it
function requestedIcons(files) {
    const icons = new Map();
    for (const file of files) {
        for (const [, , cls] of source(file).matchAll(/iconCls\s*:\s*(['"])((?:(?!\1).)*)\1/g)) {
            if (/svgicon/.test(cls)) continue;
            const icon = /btn-[^\s]+/.exec(cls);
            if (!icon) continue;
            if (!icons.has(icon[0])) icons.set(icon[0], new Set());
            icons.get(icon[0]).add(rel(file));
        }
    }
    return icons;
}

let failed = false;

function readPage(page) {
    const html = fs.readFileSync(page, 'utf8');
    const symbols = new Set();
    const sheets = [];
    for (const [, src] of html.matchAll(/<inline\s+src=["']([^"']+\.svg)["']\s*\/?>/g)) {
        sheets.push(src);
        const sheet = path.resolve(path.dirname(page), src);
        if (!fs.existsSync(sheet)) {
            console.error(`verify-sprites: MISSING_SHEET ${rel(page)} — ${src}`);
            failed = true;
            continue;
        }
        for (const [, id] of fs.readFileSync(sheet, 'utf8').matchAll(/<symbol\b[^>]*\bid=["']([^"']+)["']/g)) symbols.add(id);
    }
    const main = /data-main["']?\s*[=,]\s*["']([^"']+)["']/.exec(html)
              || /\brequire\(\s*\[\s*['"]([^'"]+)['"]/.exec(html);
    return { symbols, sheets, entry: main ? resolveModule('./' + main[1], page) : null };
}

for (const editor of EDITORS) {
    for (const sub of SUBPATHS) {
        const dir = path.join(APPS, editor, sub);
        if (!fs.existsSync(dir)) continue;
        for (const name of fs.readdirSync(dir).filter(f => f.endsWith('.html.deploy')).sort()) {
            const page = path.join(dir, name);
            const { symbols, sheets, entry } = readPage(page);
            if (!entry) {
                console.log(`verify-sprites: skipped      ${rel(page)} — no AMD entry`);
                continue;
            }
            const icons = requestedIcons(moduleGraph(entry));
            const missing = [...icons.keys()]
                .filter(id => !symbols.has(id))
                .filter(id => !EDITOR_GATED[id] || EDITOR_GATED[id].includes(editor))
                .sort();
            if (!sheets.length) {
                if (missing.length) console.log(`verify-sprites: NO_SPRITES   ${rel(page)} — inlines no sprite; its modules request ${missing.join(', ')}`);
                else console.log(`verify-sprites: ok           ${rel(page)} — no icons requested`);
                continue;
            }
            if (!missing.length) {
                console.log(`verify-sprites: ok           ${rel(page)} — ${icons.size} icons in ${sheets.length} sprites`);
                continue;
            }
            failed = true;
            console.error(`verify-sprites: MISSING      ${rel(page)} — ${missing.length} of ${icons.size} icons not in its ${sheets.length} inlined sprites:`);
            for (const id of missing) console.error(`verify-sprites:                ${id}  ← ${[...icons.get(id)].sort().join(', ')}`);
        }
    }
}

if (failed) {
    console.error('verify-sprites: FAILED — a deploy page does not inline the sprites its own modules reference');
    process.exit(1);
}

console.log('verify-sprites: all checks passed');
