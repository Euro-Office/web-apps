/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Run from web-apps/build/: npm run test:scripts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { EDITORS, CFG_DIR, readEmbedSources, minifyEmbedSources } = require('../deploy-embed.js');

const embedSrc = editor =>
    JSON.parse(fs.readFileSync(path.join(CFG_DIR, `${editor}.json`), 'utf8')).embed.js.src;

for (const editor of EDITORS) {
    test(`${editor} embed bundle gets every listed source`, () => {
        const src = embedSrc(editor);
        assert.equal(Object.keys(readEmbedSources(src)).length, src.length);
    });
}

// Euro-Office/DocumentServer#538: SearchBar.js and modals.js exist twice under
// the same file name; the view halves went missing from app-all.js.
test('documenteditor embed bundle defines the search bar and modal views', async () => {
    const { code } = await minifyEmbedSources(embedSrc('documenteditor'));
    for (const view of ['common.view.SearchBar=', 'common.view.modals=']) {
        assert.ok(code.includes(view), `app-all.js lacks ${view}`);
    }
});

test('an embed source listed twice is an error', () => {
    const src = embedSrc('documenteditor');
    assert.throws(() => readEmbedSources([...src, src[0]]), /listed twice/);
});
