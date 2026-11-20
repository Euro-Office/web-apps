/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Run: node --test scripts/verify-sprites.test.mjs
// Each test builds a throwaway apps/ tree, so the check is exercised on cases
// main does not currently contain.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { verify } from './verify-sprites.mjs';

// <tmp>/apps/… so a test can also place a file next to apps/
function tree(files) {
    const root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'verify-sprites-')), 'apps');
    for (const [rel, body] of Object.entries(files)) {
        const abs = path.join(root, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, body);
    }
    return root;
}

const sprite = (...ids) => `<svg>${ids.map(id => `<symbol id="${id}"></symbol>`).join('')}</svg>`;
const page = (...sheets) => `<html><body>${sheets.map(s => `<inline src="${s}" />`).join('\n')}
<script src="../../../vendor/requirejs/require.js"></script><script>require(['app']);</script></body></html>`;
const view = cls => `define(['common/main/lib/component/Button'], function () { new Common.UI.Button({ iconCls: '${cls}' }); });`;
const base = {
    'common/main/lib/component/Button.js': 'define([], function () {});',
    'ed/main/app.js': "require(['ed/main/app/view/Toolbar'], function () {});",
    'ed/main/sprite.svg': sprite('btn-a'),
};
const run = (files, opts = { gated: [] }) => {
    const root = tree({ ...base, ...files });
    return { ...verify(root, opts), root };
};

test('passes when every requested icon is in an inlined sprite', () => {
    const r = run({ 'ed/main/index.html.deploy': page('sprite.svg'), 'ed/main/app/view/Toolbar.js': view('toolbar__icon btn-a') });
    assert.equal(r.failed, false, r.err.join('\n'));
    assert.deepEqual(r.warn, []);
});

test('reports a page that does not inline the sprite that defines a requested icon', () => {
    // index_loader inlines a sprite, just not the one with btn-a (#286's shape)
    const r = run({ 'ed/main/index.html.deploy': page('header.svg', 'sprite.svg'), 'ed/main/index_loader.html.deploy': page('header.svg'),
                    'ed/main/header.svg': sprite('btn-header'), 'ed/main/app/view/Toolbar.js': view('toolbar__icon btn-a') });
    assert.equal(r.failed, false, 'HARD is empty, so a finding only warns');
    assert.match(r.warn.join('\n'), /WARN MISSING ed\/main\/index_loader\.html\.deploy[\s\S]*btn-a/);
    assert.doesNotMatch(r.warn.join('\n'), /WARN MISSING ed\/main\/index\.html\.deploy/);
});

test('fails when the kind of a finding is in HARD', () => {
    const files = { 'ed/main/index.html.deploy': page('header.svg', 'nope.svg'), 'ed/main/header.svg': sprite('btn-header'),
                    'ed/main/app/view/Toolbar.js': view('toolbar__icon btn-a') };
    const r = { ...verify(tree({ ...base, ...files }), { gated: [], hard: new Set(['MISSING', 'MISSING_SHEET']) }) };
    assert.equal(r.failed, true);
    assert.match(r.err.join('\n'), /^verify-sprites: MISSING_SHEET ed\/main\/index\.html\.deploy — nope\.svg$/m);
    assert.match(r.err.join('\n'), /^verify-sprites: MISSING ed\/main\/index\.html\.deploy[\s\S]*btn-a/m);
    assert.deepEqual(r.warn, []);
});

test('ignores icons in commented-out code', () => {
    const r = run({ 'ed/main/index.html.deploy': page('sprite.svg'),
                    'ed/main/app/view/Toolbar.js': `define([], function () {\n// new Common.UI.Button({ iconCls: 'btn-gone' });\n/* iconCls: 'btn-gone2' */\n});` });
    assert.deepEqual(r.warn, []);
});

test('skips svgicon classes, which templateBtnIcon draws from another sheet', () => {
    const r = run({ 'ed/main/index.html.deploy': page('sprite.svg'), 'ed/main/app/view/Toolbar.js': view('svgicon chart-bar btn-x') });
    assert.deepEqual(r.warn, []);
});

test('warns, without failing, when a declared entry does not resolve', () => {
    const r = run({ 'ed/main/index.html.deploy': page('sprite.svg').replace("require(['app'])", "require(['apps'])") });
    assert.equal(r.failed, false, r.err.join('\n'));
    assert.match(r.warn.join('\n'), /WARN UNRESOLVED ed\/main\/index\.html\.deploy/);
});

test('reports a page that inlines no sprite at all without failing', () => {
    const r = run({ 'ed/forms/index.html.deploy': page(), 'ed/forms/app.js': "require(['ed/main/app/view/Toolbar'], function () {});",
                    'ed/main/app/view/Toolbar.js': view('btn-a') });
    assert.equal(r.failed, false, r.err.join('\n'));
    assert.match(r.warn.join('\n'), /WARN NO_SPRITES ed\/forms\/index\.html\.deploy — .*btn-a/);
});

test('skips a page with no AMD entry without failing', () => {
    const r = run({ 'ed/embed/index.html.deploy': '<html><script src="app-all.js"></script></html>' });
    assert.equal(r.failed, false, r.err.join('\n'));
    assert.match(r.out.join('\n'), /skipped +ed\/embed\/index\.html\.deploy/);
});

test('reports a sprite tag that points at a missing file', () => {
    const r = run({ 'ed/main/index.html.deploy': page('nope.svg'), 'ed/main/app/view/Toolbar.js': view('btn-a') });
    assert.equal(r.failed, false);
    assert.match(r.warn.join('\n'), /WARN MISSING_SHEET ed\/main\/index\.html\.deploy — nope\.svg/);
});

test('warns, without failing, on a sprite outside apps/, and still reads it', () => {
    const r = run({ 'ed/main/index.html.deploy': page('../../../shared.svg'), 'ed/main/app/view/Toolbar.js': view('btn-a') });
    fs.writeFileSync(path.join(path.dirname(r.root), 'shared.svg'), sprite('btn-a'));
    const again = verify(r.root, { gated: [] });
    assert.equal(again.failed, false, again.err.join('\n'));
    assert.match(again.warn.join('\n'), /WARN SHEET_OUTSIDE/);
    assert.doesNotMatch(again.warn.join('\n'), /WARN MISSING/, 'the outside sprite is still read');
});

test('discovers editors instead of listing them', () => {
    const r = run({ 'neweditor/main/index.html.deploy': page('sprite.svg'), 'neweditor/main/sprite.svg': sprite('btn-z'),
                    'neweditor/main/app.js': "require(['ed/main/app/view/Toolbar'], function () {});",
                    'ed/main/app/view/Toolbar.js': view('btn-a') });
    assert.match(r.warn.join('\n'), /WARN MISSING neweditor\/main\/index\.html\.deploy/);
});

const gate = { icons: ['btn-gated'], file: 'common/main/lib/view/Shared.js', when: 'this.appConfig.canX', flag: 'canX', editors: ['ed'] };
const gatedFiles = {
    'common/main/lib/view/Shared.js': "define([], function () { if (this.appConfig.canX) new Common.UI.Button({ iconCls: 'btn-gated' }); });",
    'ed/main/app.js': "require(['common/main/lib/view/Shared'], function () {});",
    'ed/main/app/controller/Main.js': 'this.appOptions.canX = true;',
    'other/main/app.js': "require(['common/main/lib/view/Shared'], function () {});",
    'other/main/sprite.svg': sprite('btn-a'),
    'other/main/index.html.deploy': page('sprite.svg'),
};

test('a gated icon is only required on the editors that show it', () => {
    const ok = run({ ...gatedFiles, 'ed/main/sprite.svg': sprite('btn-gated'), 'ed/main/index.html.deploy': page('sprite.svg') }, { gated: [gate] });
    assert.deepEqual(ok.warn, []);
    const bad = run({ ...gatedFiles, 'ed/main/index.html.deploy': page('sprite.svg') }, { gated: [gate] });
    assert.match(bad.warn.join('\n'), /WARN MISSING ed\/main\/index\.html\.deploy[\s\S]*btn-gated/);
});

test('a stale gate warns, without failing, when its condition disappears, another editor sets the flag, or the icon is gone', () => {
    const files = { ...gatedFiles, 'ed/main/sprite.svg': sprite('btn-gated'), 'ed/main/index.html.deploy': page('sprite.svg') };
    const cond = run({ ...files, 'common/main/lib/view/Shared.js': "define([], function () { new Common.UI.Button({ iconCls: 'btn-gated' }); });" }, { gated: [gate] });
    assert.equal(cond.failed, false, cond.err.join('\n'));
    assert.match(cond.warn.join('\n'), /WARN STALE_GATE .*no longer appears/);
    const flag = run({ ...files, 'other/main/app/controller/Main.js': 'this.appOptions.canX = true;' }, { gated: [gate] });
    assert.equal(flag.failed, false, flag.err.join('\n'));
    assert.match(flag.warn.join('\n'), /WARN STALE_GATE .*canX is now also set in other/);
    const dead = run({ ...files, 'common/main/lib/view/Shared.js': 'define([], function () { if (this.appConfig.canX) {} });' }, { gated: [gate] });
    assert.equal(dead.failed, false, dead.err.join('\n'));
    assert.match(dead.warn.join('\n'), /WARN STALE_GATE btn-gated — no longer requested/);
});
