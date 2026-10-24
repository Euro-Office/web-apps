/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import assert from 'node:assert/strict';
import { filterFocusObjects, createFocusObjectsIntf } from './focusObjectTags.js';
import { chartTypes, installAsc, selectElementTypes, selectedObject } from '../../../../../test/unit-tests/mobile/ascStub.js';

// asc_CImgProperty: chart / shape properties default to null.
const imageValue = ({ chart = null, shape = null } = {}) => ({
    get_ChartProperties: () => chart,
    get_ShapeProperties: () => shape,
});

describe('DE focusObjectTags', () => {
    let T, uninstall;
    before(() => { uninstall = installAsc({ c_oAscTypeSelectElement: selectElementTypes, c_oAscChartTypeSettings: chartTypes }); T = Asc.c_oAscTypeSelectElement; });
    after(() => uninstall());

    const paragraph = () => selectedObject(T.Paragraph, {});
    const picture = value => selectedObject(T.Image, value ?? imageValue());
    const shape = value => selectedObject(T.Image, value ?? imageValue({ shape: {} }));
    const chart = value => selectedObject(T.Image, value ?? imageValue({ chart: {}, shape: {} }));

    // Rules: the edit-panel tags for each focus-object type.
    describe('DE filterFocusObjects', () => {
        it('returns [] (not null) for no focus objects', () => {
            assert.deepEqual(filterFocusObjects([]), []);
        });

        it('Paragraph gives text and paragraph', () => {
            assert.deepEqual(filterFocusObjects([paragraph()]), ['text', 'paragraph']);
        });

        it('Table gives table; Hyperlink gives hyperlink; Header gives header', () => {
            assert.deepEqual(filterFocusObjects([selectedObject(T.Table, {})]), ['table']);
            assert.deepEqual(filterFocusObjects([selectedObject(T.Hyperlink, {})]), ['hyperlink']);
            assert.deepEqual(filterFocusObjects([selectedObject(T.Header, {})]), ['header']);
        });

        it('Image with chart properties gives chart', () => {
            assert.deepEqual(filterFocusObjects([chart()]), ['chart']);
        });

        it('Image with shape properties and no chart gives shape', () => {
            assert.deepEqual(filterFocusObjects([shape()]), ['shape']);
        });

        it('Image with neither gives image', () => {
            assert.deepEqual(filterFocusObjects([picture()]), ['image']);
        });

        it('ignores other types (SpellCheck, Math, ContentControl, Shape, Chart)', () => {
            const others = [T.SpellCheck, T.Math, T.ContentControl, T.Shape, T.Chart].map(t => selectedObject(t, {}));
            assert.deepEqual(filterFocusObjects(others), []);
        });

        it('removes shape when chart is present', () => {
            assert.deepEqual(filterFocusObjects([shape(), chart()]), ['chart']);
        });

        it('de-duplicates', () => {
            assert.deepEqual(filterFocusObjects([paragraph(), paragraph(), picture(), picture()]),
                ['text', 'paragraph', 'image']);
        });
    });

    // Rules: one getter per object kind; the last match wins.
    describe('DE focus-object getters', () => {
        const intfOver = objects => createFocusObjectsIntf({ _focusObjects: objects });

        it('return undefined with no focus objects', () => {
            const intf = intfOver([]);
            for (const getter of ['getParagraphObject', 'getTableObject', 'getImageObject', 'getShapeObject',
                'getChartObject', 'getHeaderObject', 'getLinkObject']) {
                assert.equal(intf[getter](), undefined, getter);
            }
        });

        it('return the value of a single match by type', () => {
            const para = {}, table = {}, header = {}, link = {};
            const intf = intfOver([
                selectedObject(T.Paragraph, para), selectedObject(T.Table, table),
                selectedObject(T.Header, header), selectedObject(T.Hyperlink, link),
            ]);
            assert.equal(intf.getParagraphObject(), para);
            assert.equal(intf.getTableObject(), table);
            assert.equal(intf.getHeaderObject(), header);
            assert.equal(intf.getLinkObject(), link);
        });

        it('last match wins among several', () => {
            const first = {}, last = {};
            const intf = intfOver([selectedObject(T.Paragraph, first), selectedObject(T.Paragraph, last)]);
            assert.equal(intf.getParagraphObject(), last);
        });

        it('image needs both shape and chart properties unset', () => {
            const pic = imageValue(), shp = imageValue({ shape: {} }), cht = imageValue({ chart: {}, shape: {} });
            assert.equal(intfOver([picture(pic), shape(shp), chart(cht)]).getImageObject(), pic);
            assert.equal(intfOver([shape(shp)]).getImageObject(), undefined);
        });

        it('shape includes charts (chart panels read shapeObject)', () => {
            const cht = imageValue({ chart: {}, shape: {} });
            assert.equal(intfOver([chart(cht)]).getShapeObject(), cht);
        });

        it('chart needs chart properties', () => {
            const shp = imageValue({ shape: {} }), cht = imageValue({ chart: {}, shape: {} });
            assert.equal(intfOver([chart(cht), shape(shp)]).getChartObject(), cht);
            assert.equal(intfOver([shape(shp)]).getChartObject(), undefined);
        });

        it('read _focusObjects at call time, not when created', () => {
            const store = { _focusObjects: [] };
            const intf = createFocusObjectsIntf(store);
            const para = {};
            store._focusObjects = [selectedObject(T.Paragraph, para)];
            assert.equal(intf.getParagraphObject(), para);
            assert.deepEqual(intf.filterFocusObjects(), ['text', 'paragraph']);
        });
    });
});
