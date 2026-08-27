import { strict as assert } from 'node:assert';
import { getTopFocusObject } from './getTopFocusObject.js';

// Fake SDK focus-object: get_ObjectType()/get_ObjectValue() are all this helper ever calls.
const obj = (type, value) => ({ get_ObjectType: () => type, get_ObjectValue: () => value });

describe('getTopFocusObject', () => {
    it('returns null when nothing matches', () => {
        assert.equal(getTopFocusObject([obj('a', 1), obj('b', 2)], o => o.get_ObjectType() === 'c'), null);
    });

    it('returns null for an empty list', () => {
        assert.equal(getTopFocusObject([], () => true), null);
    });

    it('returns the LAST matching value, not the first -- this is the real bug this session fixed', () => {
        // Backbone precedent (confirmed in three separate source files) always takes
        // array[array.length - 1] among matches, e.g. documenteditor's EditTable.js:643
        // "tables[tables.length - 1]; // get top table". An earlier version of this helper used
        // Array.prototype.find (first match) instead, silently picking the wrong nesting level
        // whenever more than one object of the same type was in the focus stack.
        const objects = [obj('shape', 'outer'), obj('shape', 'inner')];
        assert.equal(getTopFocusObject(objects, o => o.get_ObjectType() === 'shape'), 'inner');
    });

    it('skips non-matching entries interleaved with matches', () => {
        const objects = [obj('shape', 'first'), obj('other', 'skip'), obj('shape', 'second'), obj('other', 'skip2')];
        assert.equal(getTopFocusObject(objects, o => o.get_ObjectType() === 'shape'), 'second');
    });
});
