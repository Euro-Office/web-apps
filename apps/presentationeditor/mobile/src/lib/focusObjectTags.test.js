/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import assert from 'node:assert/strict';
import { filterFocusObjects, createFocusObjectsIntf } from './focusObjectTags.js';
import { installAsc, selectElementTypes as T, selectedObject } from '../../../../../test/unit-tests/mobile/ascStub.js';

// Value fakes carry only the real sdkjs getters, so a misspelt one throws.
const locked = (isLocked = false) => ({ get_Locked: () => isLocked });
const slideValue = (locks = {}) => ({
    get_LockLayout: () => !!locks.layout,
    get_LockBackground: () => !!locks.background,
    get_LockTransition: () => !!locks.transition,
    get_LockTiming: () => !!locks.timing,
});
const shapeValue = ({ isLocked = false, fromChart = false } = {}) => ({
    get_Locked: () => isLocked,
    get_FromChart: () => fromChart,
});

const paragraph = isLocked => selectedObject(T.Paragraph, locked(isLocked));
const table = isLocked => selectedObject(T.Table, locked(isLocked));
const slide = locks => selectedObject(T.Slide, slideValue(locks));
const image = isLocked => selectedObject(T.Image, locked(isLocked));
const chart = isLocked => selectedObject(T.Chart, locked(isLocked));
const shape = opts => selectedObject(T.Shape, shapeValue(opts));
const hyperlink = () => selectedObject(T.Hyperlink, {});

describe('PE focusObjectTags', () => {
    let uninstall;
    before(() => { uninstall = installAsc({ c_oAscTypeSelectElement: T }); });
    after(() => uninstall());

    // Rules: the edit-panel tags, with locked objects excluded.
    describe('PE filterFocusObjects', () => {
        const tags = objects => filterFocusObjects(objects);

        it('returns [] (not null) for no focus objects', () => {
            assert.deepEqual(tags([]), []);
        });

        it('an unlocked paragraph gives text; a locked one gives nothing', () => {
            assert.deepEqual(tags([paragraph(false)]), ['text']);
            assert.deepEqual(tags([paragraph(true)]), []);
        });

        it('an unlocked table gives table and text; a locked one gives nothing', () => {
            assert.deepEqual(tags([table(false)]), ['text', 'table']);
            assert.deepEqual(tags([table(true)]), []);
        });

        it('a slide gives slide only with none of its four locks set', () => {
            assert.deepEqual(tags([slide()]), ['slide']);
            for (const lock of ['layout', 'background', 'transition', 'timing']) {
                assert.deepEqual(tags([slide({ [lock]: true })]), [], lock);
            }
        });

        it('an unlocked image gives image; a locked one gives nothing', () => {
            assert.deepEqual(tags([image(false)]), ['image']);
            assert.deepEqual(tags([image(true)]), []);
        });

        it('an unlocked chart gives chart; a locked one gives nothing', () => {
            assert.deepEqual(tags([chart(false)]), ['chart']);
            assert.deepEqual(tags([chart(true)]), []);
        });

        it('an unlocked shape not from a chart gives shape and text', () => {
            assert.deepEqual(tags([shape()]), ['text', 'shape']);
        });

        it('a locked shape, or a chart\'s shape, gives nothing', () => {
            assert.deepEqual(tags([shape({ isLocked: true })]), []);
            assert.deepEqual(tags([shape({ fromChart: true })]), []);
        });

        it('hyperlink is kept with text and dropped without it', () => {
            assert.deepEqual(tags([paragraph(false), hyperlink()]), ['text', 'hyperlink']);
            assert.deepEqual(tags([hyperlink()]), []);
            assert.deepEqual(tags([paragraph(true), hyperlink()]), []);
        });

        it('shape is dropped when chart is present', () => {
            assert.deepEqual(tags([shape(), chart(false)]), ['text', 'chart']);
        });

        it('puts text first and de-duplicates', () => {
            assert.deepEqual(tags([slide(), table(false), table(false), paragraph(false)]), ['text', 'slide', 'table']);
        });

        it('ignores other types', () => {
            assert.deepEqual(tags([selectedObject(T.Math, {}), selectedObject(T.SpellCheck, {})]), []);
        });
    });

    // Rules: one getter per object kind; the last match wins.
    describe('PE focus-object getters', () => {
        const intfOver = objects => createFocusObjectsIntf({ _focusObjects: objects });
        const getters = ['getSlideObject', 'getParagraphObject', 'getShapeObject', 'getImageObject',
            'getTableObject', 'getChartObject', 'getLinkObject'];

        it('return undefined with no focus objects', () => {
            const intf = intfOver([]);
            for (const getter of getters) assert.equal(intf[getter](), undefined, getter);
        });

        it('return the value of a single match by type', () => {
            const values = { Slide: {}, Paragraph: {}, Shape: {}, Image: {}, Table: {}, Chart: {}, Hyperlink: {} };
            const intf = intfOver(Object.entries(values).map(([name, value]) => selectedObject(T[name], value)));
            assert.equal(intf.getSlideObject(), values.Slide);
            assert.equal(intf.getParagraphObject(), values.Paragraph);
            assert.equal(intf.getShapeObject(), values.Shape);
            assert.equal(intf.getImageObject(), values.Image);
            assert.equal(intf.getTableObject(), values.Table);
            assert.equal(intf.getChartObject(), values.Chart);
            assert.equal(intf.getLinkObject(), values.Hyperlink);
        });

        it('last match wins among several', () => {
            const first = {}, last = {};
            assert.equal(intfOver([selectedObject(T.Slide, first), selectedObject(T.Slide, last)]).getSlideObject(), last);
        });

        it('shape is the last Shape, including a chart\'s', () => {
            const plain = shapeValue(), ofChart = shapeValue({ fromChart: true });
            const intf = intfOver([selectedObject(T.Shape, plain), selectedObject(T.Shape, ofChart), chart(false)]);
            assert.equal(intf.getShapeObject(), ofChart);
        });

        it('image skips an Image entry with no value', () => {
            const value = {};
            assert.equal(intfOver([selectedObject(T.Image, value), selectedObject(T.Image, null)]).getImageObject(), value);
        });

        it('read _focusObjects at call time, not when created', () => {
            const store = { _focusObjects: [] };
            const intf = createFocusObjectsIntf(store);
            const value = slideValue();
            store._focusObjects = [selectedObject(T.Slide, value)];
            assert.equal(intf.getSlideObject(), value);
            assert.deepEqual(intf.filterFocusObjects(), ['slide']);
        });
    });
});
