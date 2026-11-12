/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Run from web-apps/build/ after npm ci: npm run test:scripts

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VENDORS } from '../../vendor.manifest.mjs';
import { jqueryMin } from '../lib/jquery-min.js';

const REPO_ROOT    = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const NODE_MODULES = path.join(REPO_ROOT, 'build', 'node_modules');

const tempDirs = [];
after(() => tempDirs.forEach(dir => fs.rmSync(dir, { recursive: true, force: true })));

function fakeJquery(version, files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-jquery-'));
    tempDirs.push(dir);
    fs.mkdirSync(path.join(dir, 'dist'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version }));
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, 'dist', name), content);
    return dir;
}

test('every vendor manifest source exists', () => {
    const missing = VENDORS
        .map(v => path.join(v.local ? path.join(REPO_ROOT, 'vendor') : NODE_MODULES, v.src))
        .filter(src => !fs.existsSync(src));
    assert.deepEqual(missing, []);
});

test('every vendor/ symlink resolves into build/node_modules', () => {
    const links = execFileSync('git', ['-C', REPO_ROOT, 'ls-files', '-s', 'vendor'], { encoding: 'utf8' })
        .split('\n').filter(l => l.startsWith('120000')).map(l => l.split('\t')[1]);
    assert.ok(links.length > 0);
    assert.deepEqual(links.filter(l => !fs.existsSync(path.join(REPO_ROOT, l))), []);
});

test('jQuery 3 is patched with forceStyleTests', async () => {
    const { code, patched } = await jqueryMin(path.join(NODE_MODULES, 'jquery'));
    assert.equal(patched, true);
    assert.match(code, /forceStyleTests:function\(\)/);
});

test('jQuery 3 fails the build when the patch does not apply', async () => {
    const dir = fakeJquery('3.8.0', { 'jquery.js': 'var changed = true;\n' });
    await assert.rejects(jqueryMin(dir), /does not apply cleanly/);
});

test('jQuery 4 ships its own jquery.min.js unpatched', async () => {
    const dir = fakeJquery('4.0.0', { 'jquery.min.js': '/*! jQuery v4.0.0 */' });
    assert.deepEqual(await jqueryMin(dir), { code: '/*! jQuery v4.0.0 */', patched: false });
});

function buildInto(args) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-notice-'));
    tempDirs.push(dir);
    execFileSync(process.execPath, args, {
        cwd: path.join(REPO_ROOT, 'build'),
        env: { ...process.env, BUILD_ROOT: dir, PRODUCT_VERSION: '9.9.9', BUILD_NUMBER: '1', NODE_ENV: 'production' },
        stdio: 'ignore',
    });
    return dir;
}

test('deployed vendor scripts keep their licence notice', () => {
    const dir = buildInto(['scripts/deploy-common.js']);
    const missing = VENDORS.filter(v => !v.dir && v.dest.endsWith('.js'))
        .filter(v => !/license|copyright|\(c\)/i.test(fs.readFileSync(path.join(dir, 'web-apps', v.dest), 'utf8').slice(0, 1000)))
        .map(v => v.dest);
    assert.deepEqual(missing, []);
});

test('editor bundle keeps the Backbone and Underscore copyright lines', () => {
    const dir = buildInto([path.join('node_modules', 'webpack', 'bin', 'webpack.js'), '--config', 'webpack.documenteditor.mjs']);
    const bundle = fs.readFileSync(path.join(dir, 'web-apps/apps/documenteditor/main/app.js'), 'utf8');
    assert.match(bundle, /\(c\) 2010-\d{4} Jeremy Ashkenas and DocumentCloud/);
    assert.match(bundle, /\(c\) 2009-\d{4} Jeremy Ashkenas, Julian Gonggrijp/);
});
