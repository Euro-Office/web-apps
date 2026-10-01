/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import assert from 'node:assert/strict';
import { bindEditorFonts } from './editorFonts.js';
import { createApi, installCommon } from '../../../../test/unit-tests/mobile/ascStub.js';

function fontStore() {
    const calls = [];
    return { calls, initEditorFonts: (...args) => calls.push(args) };
}

// Rule: one asc_onInitEditorFonts callback calls
// store.initEditorFonts(fonts, select) on every store passed.
describe('bindEditorFonts', () => {
    let api, uninstall;

    beforeEach(() => {
        api = createApi();
        uninstall = installCommon({ api });
    });
    afterEach(() => uninstall());

    it('registers exactly one asc_onInitEditorFonts callback', () => {
        bindEditorFonts([fontStore(), fontStore()]);
        assert.equal(api.callbacks('asc_onInitEditorFonts').length, 1);
    });

    it('feeds every store (SSE passes text and cell settings)', () => {
        const text = fontStore(), cell = fontStore();
        const fonts = [];
        bindEditorFonts([text, cell]);
        api.emit('asc_onInitEditorFonts', fonts);
        assert.deepEqual(text.calls, [[fonts, undefined]]);
        assert.deepEqual(cell.calls, [[fonts, undefined]]);
        assert.equal(text.calls[0][0], fonts);
    });
});
