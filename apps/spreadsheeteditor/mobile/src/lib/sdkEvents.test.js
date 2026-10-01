/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import assert from 'node:assert/strict';
import { initThemeColors, initEditorStyles, initFonts, initCellInfo } from './sdkEvents.js';
import { createApi, installAsc, installCommon, selectElementTypes } from '../../../../../test/unit-tests/mobile/ascStub.js';

// sdkjs common/commonDefines.js c_oAscSelectionType (the values used here).
const S = { RangeCells: 1, RangeImage: 5, RangeSlicer: 8 };

describe('SSE sdkEvents', () => {
    let api, uninstallCommon, uninstallAsc;
    beforeEach(() => {
        api = createApi();
        uninstallCommon = installCommon({ api, themeColor: { setColors() {} } });
        uninstallAsc = installAsc({ c_oAscSelectionType: S, c_oAscTypeSelectElement: selectElementTypes });
    });
    afterEach(() => { uninstallCommon(); uninstallAsc(); });

    describe('SSE initThemeColors', () => {
        it('is the shared M1 registration, registered once', () => {
            initThemeColors();
            assert.equal(api.callbacks('asc_onSendThemeColors').length, 1);
        });
    });

    describe('SSE initEditorStyles', () => {
        it('maps each CStyleImage through its getters to {name, image}', () => {
            const calls = [];
            initEditorStyles({ initCellStyles: styles => calls.push(styles) });
            api.emit('asc_onInitEditorStyles', [
                { asc_getName: () => 'Normal', asc_getImage: () => 'img1' },
                { asc_getName: () => 'Bad', asc_getImage: () => 'img2' },
            ]);
            assert.deepEqual(calls, [[{ name: 'Normal', image: 'img1' }, { name: 'Bad', image: 'img2' }]]);
        });
    });

    describe('SSE initFonts', () => {
        it('feeds the raw font list to both the cell and the text store', () => {
            const order = [];
            const store = name => ({ initEditorFonts: (...args) => order.push([name, ...args]) });
            const fonts = [];
            initFonts({ storeCellSettings: store('cell'), storeTextSettings: store('text') });
            api.emit('asc_onInitEditorFonts', fonts);
            assert.deepEqual(order, [['cell', fonts, undefined], ['text', fonts, undefined]]);
        });
    });

    // Rules: registration, the selection handler (one action) and the xfs handler.
    describe('SSE initCellInfo', () => {
        let log, depth, props;
        const runInAction = fn => { depth++; try { return fn(); } finally { depth--; } };
        const store = (name, methods, fields = {}) => {
            const s = { ...fields };
            for (const m of methods) s[m] = arg => log.push([`${name}.${m}`, depth > 0, arg]);
            return s;
        };

        beforeEach(() => {
            log = [];
            depth = 0;
            props = {
                users: { isDisconnected: false },
                storeAppOptions: { isEdit: true },
                storeFocusObjects: store('focus', ['resetFocusObjects', 'resetCellInfo', 'changeFocus', 'setIsLocked'],
                    { _focusObjects: [], _cellInfo: undefined }),
                storeCellSettings: store('cell', ['initCellSettings', 'initFontSettings']),
                storeTextSettings: store('text', ['initTextSettings', 'initFontSettings']),
            };
            api.asc_getGraphicObjectProps = () => [];
        });

        const info = selectionType => ({ asc_getSelectionType: () => selectionType, asc_getHyperlink: () => null });

        it('assigns intf synchronously, before any event', () => {
            initCellInfo(props, runInAction);
            assert.deepEqual(Object.keys(props.storeFocusObjects.intf).sort(),
                ['getChartObject', 'getImageObject', 'getParagraphObject', 'getSelections', 'getShapeObject']);
            assert.deepEqual(props.storeFocusObjects.intf.getSelections(), []);
        });

        it('registers the two selection events and not asc_onFocusObject', () => {
            initCellInfo(props, runInAction);
            assert.equal(api.callbacks('asc_onSelectionChanged').length, 1);
            assert.equal(api.callbacks('asc_onEditorSelectionChanged').length, 1);
            assert.equal(api.callbacks('asc_onFocusObject').length, 0);
        });

        it('H1 runs steps b-g in order, all inside one action', () => {
            const objects = [];
            api.asc_getGraphicObjectProps = () => objects;
            const sel = info(S.RangeImage);
            initCellInfo(props, runInAction);
            api.emit('asc_onSelectionChanged', sel);
            assert.deepEqual(log, [
                ['focus.resetFocusObjects', true, objects],
                ['focus.resetCellInfo', true, sel],
                ['focus.changeFocus', true, true],
                ['focus.setIsLocked', true, sel],
                ['cell.initCellSettings', true, sel],
                ['text.initTextSettings', true, sel],
            ]);
        });

        it('H1 counts a slicer selection as an object and a cell selection as not', () => {
            initCellInfo(props, runInAction);
            api.emit('asc_onSelectionChanged', info(S.RangeSlicer));
            api.emit('asc_onSelectionChanged', info(S.RangeCells));
            assert.deepEqual(log.filter(([name]) => name === 'focus.changeFocus').map(([, , arg]) => arg), [true, false]);
        });

        it('H1 stores [] when the SDK has no graphic object props', () => {
            api.asc_getGraphicObjectProps = () => null;
            initCellInfo(props, runInAction);
            api.emit('asc_onSelectionChanged', info(S.RangeCells));
            assert.deepEqual(log[0], ['focus.resetFocusObjects', true, []]);
        });

        it('H1 does nothing while disconnected', () => {
            props.users.isDisconnected = true;
            initCellInfo(props, runInAction);
            api.emit('asc_onSelectionChanged', info(S.RangeCells));
            assert.deepEqual(log, []);
        });

        it('H1 skips steps f-g outside edit mode, reading isEdit when the event fires', () => {
            props.storeAppOptions.isEdit = false;
            initCellInfo(props, runInAction);
            api.emit('asc_onSelectionChanged', info(S.RangeCells));
            assert.deepEqual(log.map(([name]) => name),
                ['focus.resetFocusObjects', 'focus.resetCellInfo', 'focus.changeFocus', 'focus.setIsLocked']);
            log = [];
            props.storeAppOptions.isEdit = true;
            api.emit('asc_onSelectionChanged', info(S.RangeCells));
            assert.equal(log.length, 6);
        });

        it('H2 feeds xfs to the cell then the text store, in edit mode only', () => {
            const xfs = {};
            initCellInfo(props, runInAction);
            props.storeAppOptions.isEdit = false;
            api.emit('asc_onEditorSelectionChanged', xfs);
            assert.deepEqual(log, []);
            props.storeAppOptions.isEdit = true;
            api.emit('asc_onEditorSelectionChanged', xfs);
            assert.deepEqual(log, [['cell.initFontSettings', false, xfs], ['text.initFontSettings', false, xfs]]);
        });
    });
});
