/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Run from web-apps/build/: npm run test:scripts
//
// Every vendor/ library must be loaded from somewhere in apps/ or build/.
// Unreferenced ones (ace, monaco-for-ie, fetch, es6-promise) sat in the tree
// for months after the code that used them was gone.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function isReferenced(name) {
    try {
        execFileSync('git', ['-C', REPO_ROOT, 'grep', '-q', '-F', `vendor/${name}/`, '--', 'apps', 'build'], { stdio: 'ignore' });
        return true;
    } catch (err) {
        if (err.status === 1) return false;
        throw err;
    }
}

test('every vendor library is referenced from apps/ or build/', () => {
    const libs = fs.readdirSync(path.join(REPO_ROOT, 'vendor'), { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
    assert.deepEqual(libs.filter(name => !isReferenced(name)), []);
});

test('removed IE-era vendor code stays removed', () => {
    const dead = ['vendor/ace', 'vendor/monaco/monaco-for-ie', 'vendor/fetch', 'vendor/es6-promise'];
    const tracked = execFileSync('git', ['-C', REPO_ROOT, 'ls-files', ...dead], { encoding: 'utf8' });
    assert.equal(tracked, '');
    assert.deepEqual(dead.filter(d => isReferenced(d.slice('vendor/'.length))), []);
});
