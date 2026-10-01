/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import assert from 'node:assert/strict';
import {
    initThemeColors, initFonts, initEditorStyles, initFocusObjects, initTableTemplates, updateChartStyles,
} from './sdkEvents.js';
import {
    chartTypes, createApi, installAsc, installCommon, selectElementTypes, selectedObject,
} from '../../../../../test/unit-tests/mobile/ascStub.js';

// Records every method call on a fake store; `fields` are plain properties.
function recorder(methods, fields = {}) {
    const calls = [];
    const store = { calls, ...fields };
    for (const name of methods) store[name] = (...args) => calls.push([name, ...args]);
    return store;
}

const tick = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('PE sdkEvents', () => {
    let api, uninstallCommon, uninstallAsc;
    beforeEach(() => {
        api = createApi();
        uninstallCommon = installCommon({ api, themeColor: { setColors() {} } });
        uninstallAsc = installAsc({ c_oAscTypeSelectElement: selectElementTypes, c_oAscChartTypeSettings: chartTypes });
    });
    afterEach(() => { uninstallCommon(); uninstallAsc(); });

    describe('PE initThemeColors', () => {
        it('is the shared M1 registration', () => {
            initThemeColors();
            assert.equal(api.callbacks('asc_onSendThemeColors').length, 1);
        });
    });

    // Rules: the font events initFonts owns, and those it leaves to Main.
    describe('PE initFonts', () => {
        const methods = ['initEditorFonts', 'resetFontName', 'resetFontSize', 'resetIsBold', 'resetIsItalic',
            'resetIsUnderline', 'resetIsStrikeout'];

        it('feeds the font list to initEditorFonts', () => {
            const store = recorder(methods);
            const fonts = [];
            initFonts(store);
            api.emit('asc_onInitEditorFonts', fonts);
            assert.deepEqual(store.calls, [['initEditorFonts', fonts, undefined]]);
        });

        it('maps each font-state event to its reset action', () => {
            const store = recorder(methods);
            const font = {};
            initFonts(store);
            api.emit('asc_onFontFamily', font);
            api.emit('asc_onFontSize', '');
            api.emit('asc_onBold', true);
            api.emit('asc_onItalic', false);
            api.emit('asc_onUnderline', true);
            api.emit('asc_onStrikeout', false);
            assert.deepEqual(store.calls, [
                ['resetFontName', font], ['resetFontSize', ''], ['resetIsBold', true],
                ['resetIsItalic', false], ['resetIsUnderline', true], ['resetIsStrikeout', false],
            ]);
        });

        it('does not register events Main already owns', () => {
            initFonts(recorder(methods));
            for (const name of ['asc_onVerticalAlign', 'asc_onListType', 'asc_onPrAlign', 'asc_onVerticalTextAlign',
                'asc_onTextDirection', 'asc_canIncreaseIndent', 'asc_canDecreaseIndent', 'asc_onTextColor',
                'asc_onTextHighLight', 'asc_onParaSpacingLine']) {
                assert.equal(api.callbacks(name).length, 0, name);
            }
        });
    });

    // Rules: theme list, raw layouts and theme index.
    describe('PE initEditorStyles', () => {
        const methods = ['addArrayThemes', 'addArrayLayouts', 'changeSlideThemeIndex'];
        // CAscThemeInfo: get_Image, get_Index.
        const themeInfo = (index, image) => ({ get_Index: () => index, get_Image: () => image });

        it('maps built-in themes to sprite offsets and document themes to their thumbnail, built-in first', () => {
            const store = recorder(methods);
            initEditorStyles(store);
            api.emit('asc_onInitEditorStyles', [
                [themeInfo(0), themeInfo(1), themeInfo(2)],
                [themeInfo(7, 'data:doc')],
            ]);
            assert.deepEqual(store.calls, [['addArrayThemes', [
                { themeId: 0, offsety: 0 },
                { themeId: 1, offsety: 38 },
                { themeId: 2, offsety: 76 },
                { imageUrl: 'data:doc', themeId: 7, offsety: 0 },
            ]]]);
        });

        it('treats a missing sub-array as empty', () => {
            const store = recorder(methods);
            initEditorStyles(store);
            api.emit('asc_onInitEditorStyles', [[themeInfo(3)]]);
            api.emit('asc_onInitEditorStyles', [undefined, [themeInfo(4, 'u')]]);
            api.emit('asc_onInitEditorStyles', [null, null]);
            assert.deepEqual(store.calls, [
                ['addArrayThemes', [{ themeId: 3, offsety: 0 }]],
                ['addArrayThemes', [{ imageUrl: 'u', themeId: 4, offsety: 0 }]],
                ['addArrayThemes', []],
            ]);
        });

        it('stores the raw layout array and the theme index', () => {
            const store = recorder(methods);
            const layouts = [{}];
            initEditorStyles(store);
            api.emit('asc_onUpdateLayout', layouts);
            api.emit('asc_onUpdateThemeIndex', 2);
            assert.deepEqual(store.calls, [['addArrayLayouts', layouts], ['changeSlideThemeIndex', 2]]);
            assert.equal(store.calls[0][1], layouts);
        });
    });

    // Rules: intf is assigned, and the store keeps a copy of the SDK array.
    describe('PE initFocusObjects', () => {
        const focusStore = () => ({ _focusObjects: [], resetFocusObjects(objects) { this._focusObjects = objects; } });

        it('assigns intf with the eight functions', () => {
            const store = focusStore();
            initFocusObjects(store);
            assert.deepEqual(Object.keys(store.intf).sort(), [
                'filterFocusObjects', 'getChartObject', 'getImageObject', 'getLinkObject', 'getParagraphObject',
                'getShapeObject', 'getSlideObject', 'getTableObject',
            ]);
        });

        it('stores a copy of the SDK array, not the array itself', () => {
            const store = focusStore();
            initFocusObjects(store);
            const value = {};
            const sdkArray = [selectedObject(selectElementTypes.Table, value)];
            api.emit('asc_onFocusObject', sdkArray);
            assert.notEqual(store._focusObjects, sdkArray);
            sdkArray.splice(0, 1);
            assert.equal(store.intf.getTableObject(), value);
        });
    });

    // Rule: always clears; re-pulls only when the list had already been fetched.
    describe('PE initTableTemplates', () => {
        function tableStore(arrayStyles) {
            const store = recorder(['setStyles'], { arrayStyles });
            store.initTableTemplates = () => { store.calls.push(['initTableTemplates']); store.arrayStyles = []; };
            return store;
        }

        it('registers the callback (the SDK only regenerates templates when one exists)', () => {
            initTableTemplates(tableStore([]));
            assert.equal(api.callbacks('asc_onInitTableTemplates').length, 1);
        });

        it('clears and does not re-pull a list that was never fetched', async () => {
            const store = tableStore([]);
            api.asc_getTableStylesPreviews = () => assert.fail('must not fetch');
            initTableTemplates(store);
            api.emit('asc_onInitTableTemplates');
            await tick(5);
            assert.deepEqual(store.calls, [['initTableTemplates']]);
        });

        it('clears, then re-pulls a fetched list after a deferral', async () => {
            const store = tableStore([{}]);
            const previews = [];
            api.asc_getTableStylesPreviews = () => previews;
            initTableTemplates(store);
            api.emit('asc_onInitTableTemplates');
            assert.deepEqual(store.calls, [['initTableTemplates']]);
            await tick(5);
            assert.deepEqual(store.calls, [['initTableTemplates'], ['setStyles', previews]]);
        });
    });

    // Rules: previews for the selected chart's type; combo types skipped.
    describe('PE updateChartStyles', () => {
        // CAscChartProp.getType.
        const chartOfType = type => ({ getType: () => type });

        function run(chartObject) {
            const store = recorder(['clearChartStyles', 'updateChartStyles']);
            const previewCalls = [];
            api.asc_getChartPreviews = type => { previewCalls.push(type); return ['preview']; };
            updateChartStyles(store, { chartObject });
            api.emit('asc_onUpdateChartStyles');
            return { calls: store.calls, previewCalls };
        }

        it('does nothing without a chart', () => {
            assert.deepEqual(run(undefined), { calls: [], previewCalls: [] });
            assert.deepEqual(run(null), { calls: [], previewCalls: [] });
        });

        it('skips the combo types', () => {
            for (const type of [chartTypes.comboBarLine, chartTypes.comboBarLineSecondary, chartTypes.comboAreaBar,
                chartTypes.comboCustom]) {
                assert.deepEqual(run(chartOfType(type)), { calls: [], previewCalls: [] }, type);
            }
        });

        it('updates styles with the previews for the chart type', () => {
            assert.deepEqual(run(chartOfType(chartTypes.barNormal)), {
                calls: [['updateChartStyles', ['preview']]], previewCalls: [chartTypes.barNormal],
            });
        });

        it('reads chartObject when the event fires, not at registration', () => {
            const store = recorder(['clearChartStyles', 'updateChartStyles']);
            const focus = { chartObject: null };
            api.asc_getChartPreviews = () => [];
            updateChartStyles(store, focus);
            focus.chartObject = chartOfType(chartTypes.barNormal);
            api.emit('asc_onUpdateChartStyles');
            assert.equal(store.calls.length, 1);
        });
    });
});
