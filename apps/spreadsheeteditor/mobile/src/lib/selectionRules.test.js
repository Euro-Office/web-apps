/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import assert from 'node:assert/strict';
import { createCellInfoIntf, getSelections, isAddDisabled, isEditDisabled, isObj } from './selectionRules.js';
import { installAsc, selectElementTypes, selectedObject } from '../../../../../test/unit-tests/mobile/ascStub.js';

// sdkjs common/commonDefines.js c_oAscSelectionType.
const S = {
    RangeCells: 1, RangeCol: 2, RangeRow: 3, RangeMax: 4, RangeImage: 5, RangeChart: 6, RangeShape: 7,
    RangeSlicer: 8, RangeShapeText: 9, RangeChartText: 10, RangeFrozen: 11,
};
const T = selectElementTypes;

// asc_CCellInfo, asc_CImgProperty and asc_CShapeProperty, with only the getters used.
const cellInfo = (selectionType, hyperlink = null) => ({
    asc_getSelectionType: () => selectionType,
    asc_getHyperlink: () => hyperlink,
});
const drawing = ({ shape = null, chart = null } = {}) => ({
    get_ShapeProperties: () => shape,
    get_ChartProperties: () => chart,
});
const shapeProps = (fromChart = false) => ({ asc_getFromChart: () => fromChart });
const image = value => selectedObject(T.Image, value);

describe('SSE selectionRules', () => {
    let uninstall;
    before(() => { uninstall = installAsc({ c_oAscSelectionType: S, c_oAscTypeSelectElement: T }); });
    after(() => uninstall());

    // Rule: which selection types put the focus on a drawing.
    describe('SSE isObj', () => {
        it('is true for image, shape, chart, shape text, chart text and slicer selections', () => {
            for (const t of [S.RangeImage, S.RangeShape, S.RangeChart, S.RangeShapeText, S.RangeChartText, S.RangeSlicer]) {
                assert.equal(isObj(t), true, t);
            }
        });

        it('is false for cell, row, column, whole-sheet and frozen selections', () => {
            for (const t of [S.RangeCells, S.RangeCol, S.RangeRow, S.RangeMax, S.RangeFrozen]) {
                assert.equal(isObj(t), false, t);
            }
        });
    });

    // Rule: drawings are classified only for image, shape and chart selections.
    describe('SSE getSelections', () => {
        it('returns [] (not null) before any selection', () => {
            assert.deepEqual(getSelections(undefined, []), []);
        });

        it('a cell selection gives cell, plus hyperlink when the cell has one', () => {
            assert.deepEqual(getSelections(cellInfo(S.RangeCells), []), ['cell']);
            assert.deepEqual(getSelections(cellInfo(S.RangeCells, {}), []), ['cell', 'hyperlink']);
            assert.deepEqual(getSelections(cellInfo(S.RangeRow), []), ['cell']);
        });

        it('a drawing with neither shape nor chart properties gives image', () => {
            assert.deepEqual(getSelections(cellInfo(S.RangeImage), [image(drawing())]), ['image']);
        });

        it('a drawing with shape properties gives shape, or chart when the shape is a chart\'s', () => {
            assert.deepEqual(getSelections(cellInfo(S.RangeShape), [image(drawing({ shape: shapeProps() }))]), ['shape']);
            assert.deepEqual(getSelections(cellInfo(S.RangeChart), [image(drawing({ shape: shapeProps(true) }))]), ['chart']);
        });

        it('a drawing with chart properties gives chart', () => {
            assert.deepEqual(getSelections(cellInfo(S.RangeChart), [image(drawing({ chart: {} }))]), ['chart']);
        });

        it('chart wins over shape, shape over image', () => {
            const objects = [image(drawing()), image(drawing({ shape: shapeProps() })), image(drawing({ chart: {} }))];
            assert.deepEqual(getSelections(cellInfo(S.RangeShape), objects), ['chart']);
            assert.deepEqual(getSelections(cellInfo(S.RangeImage), objects.slice(0, 2)), ['shape']);
        });

        it('text inside a chart or shape adds text', () => {
            assert.deepEqual(getSelections(cellInfo(S.RangeChartText), []), ['chart', 'text']);
            assert.deepEqual(getSelections(cellInfo(S.RangeShapeText), []), ['shape', 'text']);
        });

        it('classifies objects only for image, shape and chart selections', () => {
            const chartObjects = [image(drawing({ chart: {} }))];
            assert.deepEqual(getSelections(cellInfo(S.RangeCells), chartObjects), ['cell']);
            assert.deepEqual(getSelections(cellInfo(S.RangeShapeText), chartObjects), ['shape', 'text']);
        });

        it('ignores non-Image focus objects', () => {
            assert.deepEqual(getSelections(cellInfo(S.RangeImage), [selectedObject(T.Paragraph, {})]), ['cell']);
        });
    });

    // Rules: one getter per object kind; the last match wins.
    describe('SSE focus-object getters', () => {
        const intfOver = (objects, info) => createCellInfoIntf({ _focusObjects: objects, _cellInfo: info });

        it('return undefined with no focus objects', () => {
            const intf = intfOver([]);
            for (const g of ['getShapeObject', 'getChartObject', 'getImageObject', 'getParagraphObject']) {
                assert.equal(intf[g](), undefined, g);
            }
        });

        it('shape: last Image with shape properties, chart-backed ones included', () => {
            const first = drawing({ shape: shapeProps() }), last = drawing({ shape: shapeProps(true), chart: {} });
            assert.equal(intfOver([image(first), image(drawing()), image(last)]).getShapeObject(), last);
        });

        it('chart: last Image with chart properties', () => {
            const value = drawing({ chart: {} });
            assert.equal(intfOver([image(value), image(drawing({ shape: shapeProps() }))]).getChartObject(), value);
        });

        it('image: last Image of any kind', () => {
            const first = drawing(), last = drawing({ chart: {} });
            assert.equal(intfOver([image(first), image(last)]).getImageObject(), last);
        });

        it('paragraph: last Paragraph', () => {
            const first = {}, last = {};
            const objects = [selectedObject(T.Paragraph, first), image(drawing()), selectedObject(T.Paragraph, last)];
            assert.equal(intfOver(objects).getParagraphObject(), last);
        });

        it('read the store at call time, not when created', () => {
            const store = { _focusObjects: [], _cellInfo: undefined };
            const intf = createCellInfoIntf(store);
            assert.deepEqual(intf.getSelections(), []);
            const value = drawing();
            store._cellInfo = cellInfo(S.RangeImage);
            store._focusObjects = [image(value)];
            assert.deepEqual(intf.getSelections(), ['image']);
            assert.equal(intf.getImageObject(), value);
        });
    });

    // Rules: worksheet protection gates both Edit and Add.
    describe('SSE toolbar protection gates', () => {
        const locked = { focusOn: 'obj', wsProps: { Objects: true }, isShapeLocked: true, isTextLocked: true };

        it('Edit follows disabled', () => {
            assert.equal(isEditDisabled({ disabled: true }), true);
            assert.equal(isEditDisabled({ disabled: false }), false);
        });

        it('Edit is disabled for a protected, locked drawing whose text is locked too', () => {
            assert.equal(isEditDisabled({ disabled: false, ...locked }), true);
        });

        it('Edit stays enabled when any one condition is missing', () => {
            assert.equal(isEditDisabled({ ...locked, focusOn: 'cell' }), false);
            assert.equal(isEditDisabled({ ...locked, wsProps: { Objects: false } }), false);
            assert.equal(isEditDisabled({ ...locked, wsProps: undefined }), false);
            assert.equal(isEditDisabled({ ...locked, isShapeLocked: false }), false);
            assert.equal(isEditDisabled({ ...locked, isTextLocked: false }), false);
        });

        it('Add follows disabled', () => {
            assert.equal(isAddDisabled({ disabled: true }), true);
            assert.equal(isAddDisabled({ disabled: false }), false);
        });

        it('Add is disabled when Objects, InsertHyperlinks and Sort are all protected', () => {
            assert.equal(isAddDisabled({ wsProps: { Objects: true, InsertHyperlinks: true, Sort: true } }), true);
        });

        it('Add stays enabled when any one of them is not, or protection is unknown', () => {
            assert.equal(isAddDisabled({ wsProps: { Objects: false, InsertHyperlinks: true, Sort: true } }), false);
            assert.equal(isAddDisabled({ wsProps: { Objects: true, InsertHyperlinks: false, Sort: true } }), false);
            assert.equal(isAddDisabled({ wsProps: { Objects: true, InsertHyperlinks: true, Sort: false } }), false);
            assert.equal(isAddDisabled({ wsProps: undefined }), false);
        });
    });
});
