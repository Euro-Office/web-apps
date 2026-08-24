#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Check B — output-side token survivor grep.
 *
 * Scans built editor bundles for surviving {{TOKEN}} literals.  A surviving
 * token means string-replace-loader failed to substitute a brand/config token.
 * Terser does not alter string literal contents, so this check is reliable
 * against minified output.
 *
 * Do NOT use this to check scoping-shim correctness (Common === undefined etc.)
 * — terser rewrites those expressions and the source-side Check A is the right
 * gate for them.
 *
 * Run AFTER webpack + deploy steps (BUILD_ROOT must be set).
 * Exit 0 with a summary per bundle on success.
 * Exit 1 naming the editor, file, and surviving tokens on failure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BUILD_ROOT = process.env.BUILD_ROOT
    ? path.resolve(process.env.BUILD_ROOT)
    : path.resolve(__dirname, '../../deploy');

const BUILD_OUT = path.join(BUILD_ROOT, 'web-apps');

const EDITORS = [
    'documenteditor',
    'spreadsheeteditor',
    'presentationeditor',
    'visioeditor',
    'pdfeditor',
];

const BUNDLES = [
    ...EDITORS.flatMap(ed => [
        { label: `${ed}/main/app.js`,  path: path.join(BUILD_OUT, `apps/${ed}/main/app.js`) },
        { label: `${ed}/main/code.js`, path: path.join(BUILD_OUT, `apps/${ed}/main/code.js`) },
    ]),
    { label: 'documenteditor/forms/app.js',  path: path.join(BUILD_OUT, 'apps/documenteditor/forms/app.js') },
    { label: 'documenteditor/forms/code.js', path: path.join(BUILD_OUT, 'apps/documenteditor/forms/code.js') },
];

const TOKEN_RE = /\{\{[A-Z0-9_]+\}\}/g;

let failed = false;

for (const bundle of BUNDLES) {
    if (!fs.existsSync(bundle.path)) {
        console.error(`verify-bundles: FAIL  ${bundle.label}  (not found — webpack did not emit this bundle)`);
        failed = true;
        continue;
    }
    const content = fs.readFileSync(bundle.path, 'utf8');
    const survivors = content.match(TOKEN_RE);
    if (survivors) {
        const unique = [...new Set(survivors)].join(', ');
        console.error(`verify-bundles: FAIL  ${bundle.label}  surviving tokens: ${unique}`);
        failed = true;
    } else {
        console.log(`verify-bundles: ok    ${bundle.label}`);
    }
}

if (failed) {
    console.error('verify-bundles: FAILED — unreplaced {{TOKEN}} literals in built bundles');
    process.exit(1);
}

console.log('verify-bundles: all checks passed');
