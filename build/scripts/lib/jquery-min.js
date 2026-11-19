/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

'use strict';

// Builds the deployed jquery.min.js from the npm package.
//
// jQuery 3 runs its style support tests once and caches the result. Run inside
// a hidden frame, they cache wrong values. build/patches/jquery-patch-bug-71422.diff
// adds jQuery.support.forceStyleTests() to rerun them, called from
// apps/common/main/lib/util/utils.js on repaint. jQuery 4 defers these tests
// until the page is visible, so it ships unpatched.

const fs   = require('fs');
const path = require('path');
const { minify } = require('terser');

const PATCH = path.resolve(__dirname, '..', '..', 'patches', 'jquery-patch-bug-71422.diff');

// Applies a unified diff to source. Every hunk must match exactly once.
function applyPatch(source, diff) {
    const lines = diff.split('\n');
    let hunks = 0;
    for (let i = 0; i < lines.length; i++) {
        const header = /^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/.exec(lines[i]);
        if (!header) continue;
        let oldLeft = Number(header[1] ?? 1);
        let newLeft = Number(header[2] ?? 1);
        const before = [];
        const after  = [];
        while (oldLeft > 0 || newLeft > 0) {
            const line = lines[++i];
            if (line === undefined) throw new Error('patch: truncated hunk');
            const [tag, text] = [line[0] ?? ' ', line.slice(1)];
            if (tag === ' ')      { before.push(text); after.push(text); oldLeft--; newLeft--; }
            else if (tag === '-') { before.push(text); oldLeft--; }
            else if (tag === '+') { after.push(text); newLeft--; }
            else throw new Error(`patch: malformed hunk line: ${line}`);
        }
        const from = before.join('\n') + '\n';
        const at   = source.indexOf(from);
        if (at < 0 || source.indexOf(from, at + 1) >= 0) {
            throw new Error(`patch: hunk ${hunks + 1} does not apply cleanly`);
        }
        source = source.slice(0, at) + after.join('\n') + '\n' + source.slice(at + from.length);
        hunks++;
    }
    if (!hunks) throw new Error('patch: no hunks found');
    return source;
}

// pkgDir is the installed jquery package (build/node_modules/jquery).
async function jqueryMin(pkgDir, patchFile = PATCH) {
    const { version } = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
    if (Number(version.split('.')[0]) !== 3) {
        return { code: fs.readFileSync(path.join(pkgDir, 'dist', 'jquery.min.js'), 'utf8'), patched: false };
    }
    const source = fs.readFileSync(path.join(pkgDir, 'dist', 'jquery.js'), 'utf8');
    const patched = applyPatch(source, fs.readFileSync(patchFile, 'utf8'));
    const { code } = await minify(patched, { compress: true, mangle: true });
    return { code, patched: true };
}

module.exports = { applyPatch, jqueryMin };
