/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import assert from 'node:assert/strict';
import { getTopFocusObject } from './getTopFocusObject.js';
import { selectedObject } from '../../../../test/unit-tests/mobile/ascStub.js';

const PARAGRAPH = 0;
const IMAGE = 1;

// Rule: the get_ObjectValue() of the last item with
// get_ObjectType() === type (and predicate(value) if given), else undefined.
describe('getTopFocusObject', () => {
    it('returns undefined for no focus objects', () => {
        assert.equal(getTopFocusObject([], PARAGRAPH), undefined);
    });

    it('returns the value of the only matching object', () => {
        const value = {};
        assert.equal(getTopFocusObject([selectedObject(PARAGRAPH, value)], PARAGRAPH), value);
    });

    it('returns undefined when no object has the type', () => {
        assert.equal(getTopFocusObject([selectedObject(IMAGE, {})], PARAGRAPH), undefined);
    });

    it('last match wins among several of the type', () => {
        const first = {}, last = {};
        const objects = [
            selectedObject(PARAGRAPH, first),
            selectedObject(IMAGE, {}),
            selectedObject(PARAGRAPH, last),
            selectedObject(IMAGE, {}),
        ];
        assert.equal(getTopFocusObject(objects, PARAGRAPH), last);
    });

    it('applies the predicate to the value and skips a failing last match', () => {
        const passes = { ok: true }, fails = { ok: false };
        const objects = [selectedObject(IMAGE, passes), selectedObject(IMAGE, fails)];
        const seen = [];
        const result = getTopFocusObject(objects, IMAGE, value => { seen.push(value); return value.ok; });
        assert.equal(result, passes);
        assert.deepEqual(seen, [fails, passes]);
    });

    it('returns undefined when every match fails the predicate', () => {
        assert.equal(getTopFocusObject([selectedObject(IMAGE, {})], IMAGE, () => false), undefined);
    });
});
