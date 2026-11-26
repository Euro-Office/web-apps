/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import assert from 'node:assert/strict';
import { hasChart, hasChartShape, hasShape, panelToClose } from './editTarget.js';

// The focus store's computeds, as the edit pages read them.
const shape = {};
const chart = {};
const onShape = { shapeObject: shape, chartObject: undefined, focusOn: 'obj' };
// A selected chart reports its own shape as well.
const onChart = { shapeObject: shape, chartObject: chart, focusOn: 'obj' };
const onCell = { shapeObject: undefined, chartObject: undefined, focusOn: 'cell' };

describe('SSE editTarget', () => {
    // Rule: a shape page keeps its panel only while a shape other than a
    // chart's is selected.
    describe('SSE hasShape', () => {
        it('holds while a shape is selected', () => {
            assert.equal(hasShape(onShape), true);
        });
        it('fails once the selection moves to a cell', () => {
            assert.equal(hasShape(onCell), false);
        });
        it('fails while a chart is selected, although the chart reports a shape', () => {
            assert.equal(hasShape(onChart), false);
        });
        it('fails when the focus is on cells, whatever objects linger', () => {
            assert.equal(hasShape({ ...onShape, focusOn: 'cell' }), false);
        });
    });

    // Rule: a chart page keeps its panel only while a chart is selected.
    describe('SSE hasChart', () => {
        it('holds while a chart is selected', () => {
            assert.equal(hasChart(onChart), true);
        });
        it('fails once the selection moves to a cell', () => {
            assert.equal(hasChart(onCell), false);
        });
        it('fails for a plain shape', () => {
            assert.equal(hasChart(onShape), false);
        });
        it('fails when the focus is on cells, whatever objects linger', () => {
            assert.equal(hasChart({ ...onChart, focusOn: 'cell' }), false);
        });
    });

    // Rule: the chart fill page needs the chart and the chart's shape.
    describe('SSE hasChartShape', () => {
        it('holds while a chart with its shape is selected', () => {
            assert.equal(hasChartShape(onChart), true);
        });
        it('fails once the selection moves to a cell', () => {
            assert.equal(hasChartShape(onCell), false);
        });
        it('fails for a chart that reports no shape', () => {
            assert.equal(hasChartShape({ ...onChart, shapeObject: undefined }), false);
        });
    });

    // Rule: a page that lost its object closes the sheet on phones and the
    // popover on tablets, and closes nothing while the object is there.
    describe('SSE panelToClose', () => {
        it('closes nothing while the object is there', () => {
            assert.equal(panelToClose(true, true), null);
            assert.equal(panelToClose(true, false), null);
        });
        it('closes the sheet on a phone', () => {
            assert.equal(panelToClose(false, true), 'sheet');
        });
        it('closes the popover on a tablet', () => {
            assert.equal(panelToClose(false, false), 'popover');
        });
        it('closes the chart fill page panel after a chart gives way to a cell', () => {
            assert.equal(panelToClose(hasChartShape(onCell), true), 'sheet');
            assert.equal(panelToClose(hasChartShape(onCell), false), 'popover');
        });
        it('closes a shape page panel when the selection moves from a shape to a chart', () => {
            assert.equal(panelToClose(hasShape(onChart), false), 'popover');
        });
    });
});
