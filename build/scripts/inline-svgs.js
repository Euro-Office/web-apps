#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

'use strict';

// Replaces grunt-inline tags in built HTML files. Handles two patterns:
//   <inline src="path/to/file.svg" />     → inlines raw SVG content
//   <script src="path/to/file.js?__inline=true"></script> → inlines JS content
//
// Run after grunt (which copies .html.deploy → .html in BUILD_ROOT):
//   node scripts/inline-svgs.js
//
// BUILD_ROOT env var must match what grunt and webpack use.

const fs   = require('fs');
const path = require('path');

const BUILD_ROOT = process.env.BUILD_ROOT
    ? path.resolve(process.env.BUILD_ROOT)
    : path.resolve(__dirname, '../../deploy');

const APPS_OUT = path.join(BUILD_ROOT, 'web-apps', 'apps');

const DIRS = [
    { editor: 'documenteditor',     subpath: 'main'  },
    { editor: 'spreadsheeteditor',  subpath: 'main'  },
    { editor: 'presentationeditor', subpath: 'main'  },
    { editor: 'pdfeditor',          subpath: 'main'  },
    { editor: 'visioeditor',        subpath: 'main'  },
    { editor: 'documenteditor',     subpath: 'forms' },
    { editor: 'common',             subpath: ''      },
];

// Mirror grunt-inline's exact regexes.
const INLINE_RE = /<inline.+?src=["']([^"']+?)["']\s*?\/>/g;
const SCRIPT_RE = /<script.+?src=["']([^"']+?)["'].*?>\s*<\/script>/g;

let totalSubstitutions = 0;

function resolveSrc(dir, src) {
    const clean = src.split('?')[0];
    return path.isAbsolute(clean) ? clean : path.resolve(dir, clean);
}

function processFile(htmlPath) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dir  = path.dirname(htmlPath);
    let count  = 0;

    // Pass 1: <inline src="...svg" />
    let result = html.replace(INLINE_RE, (match, src) => {
        if (/^https?:\/\//.test(src)) return match;
        const filePath = resolveSrc(dir, src);
        if (!fs.existsSync(filePath)) {
            console.error(`inline: MISSING SVG  ${filePath}`);
            console.error(`         from        ${htmlPath}`);
            process.exitCode = 1;
            return match;
        }
        count++;
        return fs.readFileSync(filePath, 'utf8');
    });

        // Pass 2: <script src="...?__inline=true"></script>
    // Note: grunt-inline ran uglify-js on inlined content (uglify:true). This script
    // inlines raw source — functionally identical but output differs from the grunt
    // baseline. Intentional: the scripts are <2KB each and the complexity of adding
    // a minifier pass outweighs the benefit.
    result = result.replace(SCRIPT_RE, (match, src) => {
        if (!src.includes('__inline')) return match;
        if (/^https?:\/\//.test(src)) return match;
        const filePath = resolveSrc(dir, src);
        if (!fs.existsSync(filePath)) {
            // device_scale.js has a malformed relative path (6 levels up) that
            // has never resolved correctly from BUILD_ROOT — warn and leave tag.
            console.warn(`inline: missing script ${filePath} — leaving tag`);
            return match;
        }
        count++;
        return `<script>${fs.readFileSync(filePath, 'utf8')}</script>`;
    });

    totalSubstitutions += count;
    if (count > 0) {
        fs.writeFileSync(htmlPath, result, 'utf8');
        console.log(`inline: processed ${path.relative(APPS_OUT, htmlPath)} (${count} tag${count !== 1 ? 's' : ''})`);
    }
}

for (const { editor, subpath } of DIRS) {
    const editorDir = path.join(APPS_OUT, editor, subpath);

    if (!fs.existsSync(editorDir)) {
        console.error(`inline: missing dir ${editorDir} — deploy-html.js may not have run`);
        process.exitCode = 1;
        continue;
    }

    const htmlFiles = fs.readdirSync(editorDir)
        .filter(f => f.endsWith('.html'))
        .map(f => path.join(editorDir, f));

    if (htmlFiles.length === 0) {
        console.error(`inline: no .html files in ${editorDir} — deploy-html.js may have failed`);
        process.exitCode = 1;
        continue;
    }

    const beforeEditor = totalSubstitutions;
    for (const file of htmlFiles) {
        processFile(file);
    }
    if (totalSubstitutions === beforeEditor) {
        console.error(`inline: no substitutions in ${editor}/${subpath} — template may have moved or tags changed`);
        process.exitCode = 1;
    }
}

if (totalSubstitutions === 0 && process.exitCode !== 1) {
    console.error('inline: zero substitutions — tags missing or build shape changed');
    process.exitCode = 1;
}

if (process.exitCode === 1) {
    console.error('inline: FAILED');
    process.exit(1);
} else {
    console.log(`inline: done — ${totalSubstitutions} substitution${totalSubstitutions !== 1 ? 's' : ''} total`);
}
