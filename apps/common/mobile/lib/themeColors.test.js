/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import assert from 'node:assert/strict';
import { initThemeColors } from './themeColors.js';
import { createApi, installCommon } from '../../../../test/unit-tests/mobile/ascStub.js';

// Rule: register asc_onSendThemeColors →
// Common.Utils.ThemeColor.setColors(colors, standart_colors).
describe('initThemeColors', () => {
    let api, calls, uninstall;

    beforeEach(() => {
        api = createApi();
        calls = [];
        uninstall = installCommon({ api, themeColor: { setColors: (...args) => calls.push(args) } });
    });
    afterEach(() => uninstall());

    it('registers exactly one asc_onSendThemeColors callback', () => {
        initThemeColors();
        assert.equal(api.callbacks('asc_onSendThemeColors').length, 1);
    });

    it('passes both arguments through to setColors', () => {
        const colors = [], standart = [];
        initThemeColors();
        api.emit('asc_onSendThemeColors', colors, standart);
        assert.deepEqual(calls, [[colors, standart]]);
        assert.equal(calls[0][0], colors);
        assert.equal(calls[0][1], standart);
    });

    // The presentation editor sends standart_colors as null after the first send.
    it('passes a null standart_colors through unchanged', () => {
        const colors = [];
        initThemeColors();
        api.emit('asc_onSendThemeColors', colors, null);
        assert.deepEqual(calls, [[colors, null]]);
    });
});
