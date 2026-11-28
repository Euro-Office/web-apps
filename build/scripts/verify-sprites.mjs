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
 *   2. follows the module ids it names through the source tree — the same
 *      graph webpack bundles, including require.config path aliases,
 *   3. collects the icon ids those modules request, extracting them from each
 *      iconCls literal exactly as templateBtnIcon does (/btn-[^\s]+/; an
 *      iconCls with "svgicon" takes the other branch and is skipped), and
 *   4. fails if any id is not a <symbol> in a sprite the page inlines.
 *
 * Editors are discovered, not listed: any apps/<dir>/{main,embed,forms} with
 * a *.html.deploy is checked.
 *
 * Results. Every finding is printed as WARN and the check exits 0, unless its
 * kind is listed in HARD below. HARD is empty for now: none of these stop an
 * editor from working, so the check reports rather than blocks.
 *   MISSING        a page lacks icons its own buttons draw. Most toolbar
 *                  buttons are icon-only, so a blank icon hides what the
 *                  button does (#286 blanked every toolbar button). The
 *                  strongest candidate for HARD.
 *   MISSING_SHEET  an <inline> tag names a sprite that does not exist, so
 *                  every icon in it is blank. Also a candidate for HARD.
 *   UNRESOLVED     the page names an AMD entry this check cannot follow. A
 *                  limit of the check, not of the page; verify-deploy.mjs
 *                  asserts the built app.js exists.
 *   SHEET_OUTSIDE  a sprite path resolves outside apps/. It is still read.
 *   STALE_GATE     an EDITOR_GATED entry no longer matches the source. At
 *                  worst one gated button in one editor lacks its icon.
 *   NO_SPRITES     the page inlines no sprite but its modules request icons
 *                  (the forms page). It draws with the svg-icon CSS class
 *                  instead; whether the shared components that request icons
 *                  are ever shown there is a question for the page's owner.
 *   skipped        info only: no AMD entry (embed loads a prebuilt app-all.js).
 *
 * Module ids are taken from every string literal that resolves to a file
 * under apps/, not only from define()/require() arrays: the arrays miss the
 * require.config path aliases (core, notification, tip, …), which webpack
 * bundles too. Against main both readings give the same icon set for every
 * entry; the wider one also pulls in those alias targets.
 *
 * Runs in the gates phase, after deploy-sprites.js has regenerated the
 * per-editor toolbar/icons.svg in the source tree. It reads only the source
 * tree, so it can also be run on its own: node scripts/verify-sprites.mjs
 * Tests: node --test scripts/verify-sprites.test.mjs
 *
 * Exit 0 with a summary per page and any WARN lines. Warnings go to stdout,
 * which build-pipeline.js shows for passing steps too.
 * Exit 1 only for a finding whose kind is in HARD.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUBPATHS = ['main', 'embed', 'forms'];

// Result kinds that fail the build (exit 1). Empty: every finding is a WARN.
// Add 'MISSING' (and 'MISSING_SHEET') here to make blank icons block a build.
export const HARD = new Set([]);

// Icons requested by a shared view that only renders them in some editors.
// The view is bundled everywhere, but the button is created or shown behind a
// runtime condition that only some editors set, so the other editors' sprites
// rightly leave the symbol out. Anything not listed here is required on every
// page whose modules request it.
//
// Each entry is checked against the source, so it cannot go stale silently:
//   - `when` must still appear in `file` (the condition that gates the icon),
//   - `flag`, when given, may only be assigned in the code of the `editors`
//     listed (apps/<editor>/** for every editor with a deploy page).
//     apps/common and apps/api are not editors: the shared controllers only
//     narrow these flags (e.g. ReviewChanges.js resets canReview to false in
//     view mode), and api.js only passes the integrator's config through; an
//     editor has to copy a flag into its own appOptions for it to apply,
//   - every icon must still be requested by some page; otherwise the entry is
//     dead and should be removed.
export const EDITOR_GATED = [
    { icons: ['btn-review-save', 'btn-review-deny', 'btn-big-ic-review'],
      file: 'common/main/lib/view/ReviewChanges.js', when: 'this.appConfig.canReview', flag: 'canReview',
      editors: ['documenteditor'] },
    { icons: ['btn-combine'],
      file: 'common/main/lib/view/ReviewChanges.js', when: 'this.appConfig.canFeatureComparison', flag: 'canFeatureComparison',
      editors: ['documenteditor'] },
    { icons: ['btn-ic-reviewview'],
      file: 'common/main/lib/view/ReviewChanges.js', when: 'this.appConfig.canViewReview', flag: 'canViewReview',
      editors: ['documenteditor'] },
    { icons: ['btn-mailmerge'],
      file: 'common/main/lib/view/ReviewChanges.js', when: 'this.appConfig.canUseMailMerge', flag: 'canUseMailMerge',
      editors: ['documenteditor'] },
    { icons: ['btn-filling-status'],
      file: 'common/main/lib/view/Header.js', when: 'config.canRequestFillingStatus', flag: 'canRequestFillingStatus',
      editors: ['documenteditor'] },
    { icons: ['btn-find-redacted'],
      file: 'common/main/lib/view/SearchPanel.js', when: 'this.options.mode.isPDFEdit', flag: 'isPDFEdit',
      editors: ['pdfeditor'] },
    // Never created: the branch is disabled with a literal 0.
    { icons: ['btn-restrict-editing'],
      file: 'common/main/lib/view/Protection.js', when: 'if(0 && this.appConfig.isPDFForm)', flag: null,
      editors: [] },
];

// Comments are stripped so that commented-out buttons (e.g. the show/hide
// details buttons in spreadsheeteditor's DataTab.js) don't count. The line
// comment pattern leaves "://" alone so URLs inside strings survive. Against
// main this gives the same iconCls and module-id sets as a tokenizer that
// honours strings, template and regex literals, for every file a graph reaches.
function stripComments(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

export function verify(apps, { gated = EDITOR_GATED, hard = HARD } = {}) {
    apps = path.resolve(apps);
    const inApps = abs => abs.startsWith(apps + path.sep);
    const rel = abs => path.relative(apps, abs).split(path.sep).join('/');
    const out = [], err = [], warn = [];
    let failed = false;
    const report = (kind, text) => {
        if (hard.has(kind)) {
            err.push(`verify-sprites: ${kind} ${text}`);
            failed = true;
        } else {
            warn.push(`verify-sprites: WARN ${kind} ${text}`);
        }
    };

    const sourceCache = new Map();
    const source = file => {
        if (!sourceCache.has(file)) sourceCache.set(file, stripComments(fs.readFileSync(file, 'utf8')));
        return sourceCache.get(file);
    };

    // Module ids resolve against apps/ (the require.config baseUrl of every
    // editor) or, when relative, against the requiring file. text!-templates
    // and ids outside apps/ (vendor, sdkjs) are not followed: none of them
    // create buttons.
    const resolveModule = (id, fromFile) => {
        if (id.startsWith('text!')) return null;
        const base = id.startsWith('.') ? path.resolve(path.dirname(fromFile), id) : path.join(apps, id);
        const file = base.endsWith('.js') ? base : base + '.js';
        if (!inApps(file)) return null;
        return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
    };

    // icon id -> modules that request it, per module and per entry
    const moduleIcons = new Map();
    const iconsOf = file => {
        if (!moduleIcons.has(file)) {
            const icons = new Map();
            for (const [, , cls] of source(file).matchAll(/iconCls\s*:\s*(['"])((?:(?!\1).)*)\1/g)) {
                if (/svgicon/.test(cls)) continue;
                const icon = /btn-[^\s]+/.exec(cls);
                if (icon && !icons.has(icon[0])) icons.set(icon[0], rel(file));
            }
            moduleIcons.set(file, icons);
        }
        return moduleIcons.get(file);
    };
    const entryIcons = new Map();
    const requestedIcons = entry => {
        if (entryIcons.has(entry)) return entryIcons.get(entry);
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
        const icons = new Map();
        for (const file of seen) {
            for (const [id, mod] of iconsOf(file)) {
                if (!icons.has(id)) icons.set(id, new Set());
                icons.get(id).add(mod);
            }
        }
        entryIcons.set(entry, icons);
        return icons;
    };

    const sheetCache = new Map();
    const symbolsOf = sheet => {
        if (!sheetCache.has(sheet)) {
            const ids = new Set();
            for (const [, id] of fs.readFileSync(sheet, 'utf8').matchAll(/<symbol\b[^>]*\bid=["']([^"']+)["']/g)) ids.add(id);
            sheetCache.set(sheet, ids);
        }
        return sheetCache.get(sheet);
    };

    const readPage = page => {
        const html = fs.readFileSync(page, 'utf8');
        const symbols = new Set();
        const sheets = [];
        for (const [, src] of html.matchAll(/<inline\s+src=["']([^"']+\.svg)["']\s*\/?>/g)) {
            sheets.push(src);
            const sheet = path.resolve(path.dirname(page), src);
            if (!inApps(sheet)) report('SHEET_OUTSIDE', `${rel(page)} — ${src} resolves outside apps/`);
            if (!fs.existsSync(sheet)) {
                report('MISSING_SHEET', `${rel(page)} — ${src}`);
                continue;
            }
            for (const id of symbolsOf(sheet)) symbols.add(id);
        }
        const main = /data-main["']?\s*[=,]\s*["']([^"']+)["']/.exec(html)
                  || /\brequire\(\s*\[\s*['"]([^'"]+)['"]/.exec(html);
        return { symbols, sheets, declared: main && main[1], entry: main ? resolveModule('./' + main[1], page) : null };
    };

    const gateOf = new Map();
    for (const g of gated) for (const id of g.icons) gateOf.set(id, g);
    const requestedAnywhere = new Set();
    const pageEditors = new Set();

    const editors = fs.readdirSync(apps, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
    for (const editor of editors) {
        for (const sub of SUBPATHS) {
            const dir = path.join(apps, editor, sub);
            if (!fs.existsSync(dir)) continue;
            for (const name of fs.readdirSync(dir).filter(f => f.endsWith('.html.deploy')).sort()) {
                const page = path.join(dir, name);
                pageEditors.add(editor);
                const { symbols, sheets, declared, entry } = readPage(page);
                if (declared && !entry) {
                    report('UNRESOLVED', `${rel(page)} — entry '${declared}' does not resolve to a module under apps/; page not verified`);
                    continue;
                }
                if (!entry) {
                    out.push(`verify-sprites: skipped      ${rel(page)} — no AMD entry`);
                    continue;
                }
                const icons = requestedIcons(entry);
                for (const id of icons.keys()) requestedAnywhere.add(id);
                const missing = [...icons.keys()]
                    .filter(id => !symbols.has(id))
                    .filter(id => !gateOf.has(id) || gateOf.get(id).editors.includes(editor))
                    .sort();
                if (!sheets.length) {
                    if (missing.length) report('NO_SPRITES', `${rel(page)} — inlines no sprite; its modules request ${missing.join(', ')}`);
                    else out.push(`verify-sprites: ok           ${rel(page)} — no icons requested`);
                    continue;
                }
                if (!missing.length) {
                    out.push(`verify-sprites: ok           ${rel(page)} — ${icons.size} icons in ${sheets.length} sprites`);
                    continue;
                }
                report('MISSING', `${rel(page)} — ${missing.length} of ${icons.size} icons not in its ${sheets.length} inlined sprites:`);
                for (const id of missing) report('MISSING', `  ${id}  ← ${[...icons.get(id)].sort().join(', ')}`);
            }
        }
    }

    // ---- EDITOR_GATED must still describe the source --------------------------
    for (const g of gated) {
        const label = g.icons.join(', ');
        const file = path.join(apps, g.file);
        if (!fs.existsSync(file)) {
            report('STALE_GATE', `${label} — ${g.file} no longer exists`);
            continue;
        }
        if (!fs.readFileSync(file, 'utf8').includes(g.when)) {
            report('STALE_GATE', `${label} — '${g.when}' no longer appears in ${g.file}`);
        }
        if (g.flag) {
            const assign = new RegExp(`\\.${g.flag}\\s*=(?!=)`);
            const setters = [...pageEditors].filter(ed => jsFiles(path.join(apps, ed)).some(f => assign.test(source(f))));
            const extra = setters.filter(ed => !g.editors.includes(ed));
            if (extra.length) report('STALE_GATE', `${label} — ${g.flag} is now also set in ${extra.join(', ')}`);
        }
        const dead = g.icons.filter(id => !requestedAnywhere.has(id));
        if (dead.length) report('STALE_GATE', `${dead.join(', ')} — no longer requested by any page; remove from EDITOR_GATED`);
    }

    return { failed, out, err, warn };
}

function jsFiles(dir, acc = []) {
    if (!fs.existsSync(dir)) return acc;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'mobile' || e.name === 'node_modules' || e.name === 'resources') continue;
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) jsFiles(abs, acc);
        else if (e.name.endsWith('.js')) acc.push(abs);
    }
    return acc;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const { failed, out, err, warn } = verify(path.resolve(__dirname, '../../apps'));
    for (const line of out) console.log(line);
    // stdout, not stderr: build-pipeline.js only shows stderr for failing steps
    for (const line of warn) console.log(line);
    for (const line of err) console.error(line);
    if (failed) {
        console.error(`verify-sprites: FAILED — findings of a kind listed in HARD (${[...HARD].join(', ')})`);
        process.exit(1);
    }
    const kinds = [...new Set(warn.map(line => line.split(' ')[2]))].join(', ');
    console.log(warn.length
        ? `verify-sprites: done with warnings (${kinds}) — not failing the build; see HARD`
        : 'verify-sprites: all checks passed');
}
