#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

'use strict';

// Replaces grunt's deploy-app-embed task for documenteditor, spreadsheeteditor,
// presentationeditor, and visioeditor (pdfeditor has no embed build).
//
// Per editor: clean → terser+concat JS → LESS CSS → copy locale+HTML+images →
//             replace @@SRC_ROOT@@ → inline ?__inline=true scripts → clean img dir
//
// Run after grunt and inline-svgs.js:
//   node scripts/deploy-embed.js
//
// BUILD_ROOT env var must match what grunt and webpack use.

const fs   = require('fs');
const path = require('path');
const less = require('less');
const { minify } = require('terser');

const REPO_ROOT  = path.resolve(__dirname, '..', '..');
const BUILD_ROOT = process.env.BUILD_ROOT
    ? path.resolve(process.env.BUILD_ROOT)
    : path.resolve(REPO_ROOT, 'deploy');
const SRC_ROOT   = REPO_ROOT;
const CFG_DIR    = path.resolve(__dirname, '..');

const EDITORS = [
    'documenteditor',
    'spreadsheeteditor',
    'presentationeditor',
    'visioeditor',
];

// Same pattern as inline-svgs.js — handles ?__inline=true scripts only.
const SCRIPT_RE = /<script.+?src=["']([^"']+?)["'].*?>\s*<\/script>/g;

function resolveTokens(str) {
    return str.replace(/\$BUILD_ROOT/g, BUILD_ROOT);
}

function fromRepoRoot(configPath) {
    // Config paths start with ../  (relative to build/), strip leading ../
    return path.resolve(REPO_ROOT, configPath.replace(/^\.\.\//, ''));
}

function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(s, d);
        } else {
            fs.copyFileSync(s, d);
        }
    }
}

async function buildEditor(editorName) {
    const cfg = JSON.parse(
        fs.readFileSync(path.join(CFG_DIR, `${editorName}.json`), 'utf8')
    );
    const emb = cfg.embed;

    const jsDist   = resolveTokens(emb.js.dist);
    const lessSrc  = fromRepoRoot(emb.less.files.src);
    const lessDist = resolveTokens(emb.less.files.dist);
    const embedOut = path.dirname(jsDist);   // $BUILD_ROOT/web-apps/apps/{editor}/embed

    // 1. clean:prebuild
    fs.rmSync(embedOut, { recursive: true, force: true });

    // 2. terser — concat all JS sources, then minify
    const sources = {};
    for (const src of emb.js.src) {
        const absPath = fromRepoRoot(src);
        sources[path.basename(absPath)] = fs.readFileSync(absPath, 'utf8');
    }
    const minified = await minify(sources, {
        compress: true,
        mangle:   true,
        format:   { comments: false },
    });
    fs.mkdirSync(embedOut, { recursive: true });
    fs.writeFileSync(jsDist, minified.code, 'utf8');

    // 3. less — compile CSS
    const lessSource = fs.readFileSync(lessSrc, 'utf8');
    const lessResult = await less.render(lessSource, {
        filename: lessSrc,
        paths:    [path.dirname(lessSrc)],
        compress: true,
    });
    fs.mkdirSync(path.dirname(lessDist), { recursive: true });
    fs.writeFileSync(lessDist, lessResult.css, 'utf8');

    // 4a. copy localization
    const localeSrc  = fromRepoRoot(emb.copy.localization[0].cwd);
    const localeDest = resolveTokens(emb.copy.localization[0].dest);
    copyDir(localeSrc, localeDest);

    // 4b. copy indexhtml (.html.deploy → .html)
    const htmlSrcDir  = fromRepoRoot(emb.copy.indexhtml[0].cwd);
    const htmlDestDir = resolveTokens(emb.copy.indexhtml[0].dest);
    fs.mkdirSync(htmlDestDir, { recursive: true });
    for (const f of fs.readdirSync(htmlSrcDir)) {
        if (!f.endsWith('.html.deploy')) continue;
        fs.copyFileSync(
            path.join(htmlSrcDir, f),
            path.join(htmlDestDir, f.replace('.html.deploy', '.html'))
        );
    }

    // 4c. copy images-app (common embed images — needed on disk for inline step)
    const imgSrc  = fromRepoRoot(emb.copy['images-app'][0].cwd);
    const imgDest = resolveTokens(emb.copy['images-app'][0].dest);
    copyDir(imgSrc, imgDest);

    // 5. replace @@SRC_ROOT@@ in all HTML files
    for (const f of fs.readdirSync(htmlDestDir)) {
        if (!f.endsWith('.html')) continue;
        const p       = path.join(htmlDestDir, f);
        const content = fs.readFileSync(p, 'utf8');
        fs.writeFileSync(p, content.replace(/@@SRC_ROOT@@/g, SRC_ROOT), 'utf8');
    }

    // 6. inline ?__inline=true scripts (mirrors inline-svgs.js SCRIPT_RE logic)
    for (const f of fs.readdirSync(htmlDestDir)) {
        if (!f.endsWith('.html')) continue;
        const p    = path.join(htmlDestDir, f);
        let   html = fs.readFileSync(p, 'utf8');
        let   changed = false;
        html = html.replace(SCRIPT_RE, (match, src) => {
            if (!src.includes('?__inline=true')) return match;
            const clean   = src.split('?')[0];
            const absPath = path.isAbsolute(clean) ? clean : path.resolve(htmlDestDir, clean);
            if (!fs.existsSync(absPath)) {
                console.warn(`deploy-embed: inline source not found: ${absPath}`);
                return match;
            }
            changed = true;
            return `<script>${fs.readFileSync(absPath, 'utf8')}</script>`;
        });
        if (changed) fs.writeFileSync(p, html, 'utf8');
    }

    // 7. clean:postbuild — remove img dir (was only needed for the inline step)
    fs.rmSync(imgDest, { recursive: true, force: true });

    console.log(`deploy-embed: ${editorName} done`);
}

(async () => {
    for (const editor of EDITORS) {
        await buildEditor(editor);
    }
    console.log('deploy-embed: all editors done');
})().catch(err => {
    console.error('deploy-embed failed:', err.message || err);
    process.exit(1);
});
