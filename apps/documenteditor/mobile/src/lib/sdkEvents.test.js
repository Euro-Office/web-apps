/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import assert from 'node:assert/strict';
import {
    initThemeColors, initFonts, initFocusObjects, initEditorStyles, initTableTemplates, updateChartStyles,
} from './sdkEvents.js';
import { chartTypes, createApi, installAsc, installCommon, selectElementTypes, selectedObject } from '../../../../../test/unit-tests/mobile/ascStub.js';

// Records every method call on a fake store; `fields` are plain properties.
function recorder(methods, fields = {}) {
    const calls = [];
    const store = { calls, ...fields };
    for (const name of methods) store[name] = (...args) => calls.push([name, ...args]);
    return store;
}

const tick = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('DE sdkEvents', () => {
    let api, uninstallCommon, uninstallAsc;
    beforeEach(() => {
        api = createApi();
        uninstallCommon = installCommon({ api, themeColor: { setColors() {} } });
        uninstallAsc = installAsc({ c_oAscTypeSelectElement: selectElementTypes, c_oAscChartTypeSettings: chartTypes });
    });
    afterEach(() => { uninstallCommon(); uninstallAsc(); });

    describe('DE initThemeColors', () => {
        it('is the shared M1 registration', () => {
            initThemeColors();
            assert.equal(api.callbacks('asc_onSendThemeColors').length, 1);
        });
    });

    // Rules: the font events initFonts owns, and those it leaves to Main.
    describe('DE initFonts', () => {
        const methods = ['initEditorFonts', 'resetFontName', 'resetFontSize', 'resetIsBold', 'resetIsItalic',
            'resetIsUnderline', 'resetIsStrikeout'];

        it('feeds the font list to initEditorFonts', () => {
            const store = recorder(methods);
            const fonts = [];
            initFonts(store);
            api.emit('asc_onInitEditorFonts', fonts);
            assert.deepEqual(store.calls, [['initEditorFonts', fonts, undefined]]);
        });

        it('maps each font-state event to its reset action, passing undefined through', () => {
            const store = recorder(methods);
            const font = {};
            initFonts(store);
            api.emit('asc_onFontFamily', font);
            api.emit('asc_onFontSize', undefined);
            api.emit('asc_onBold', true);
            api.emit('asc_onItalic', false);
            api.emit('asc_onUnderline', undefined);
            api.emit('asc_onStrikeout', true);
            assert.deepEqual(store.calls, [
                ['resetFontName', font], ['resetFontSize', undefined], ['resetIsBold', true],
                ['resetIsItalic', false], ['resetIsUnderline', undefined], ['resetIsStrikeout', true],
            ]);
        });

        it('does not register events Main already owns, nor ListType / TextShd', () => {
            initFonts(recorder(methods));
            for (const name of ['asc_onVerticalAlign', 'asc_onPrAlign', 'asc_onTextColor', 'asc_onParaSpacingLine',
                'asc_onListType', 'asc_onTextShd']) {
                assert.equal(api.callbacks(name).length, 0, name);
            }
        });
    });

    // Rules: intf is assigned, and the store keeps a copy of the SDK array.
    describe('DE initFocusObjects', () => {
        const focusStore = () => ({ _focusObjects: [], resetFocusObjects(objects) { this._focusObjects = objects; } });

        it('assigns intf with the eight functions', () => {
            const store = focusStore();
            initFocusObjects(store);
            assert.deepEqual(Object.keys(store.intf).sort(), [
                'filterFocusObjects', 'getChartObject', 'getHeaderObject', 'getImageObject', 'getLinkObject',
                'getParagraphObject', 'getShapeObject', 'getTableObject',
            ]);
        });

        it('stores a copy of the SDK array, not the array itself', () => {
            const store = focusStore();
            initFocusObjects(store);
            const para = {};
            const sdkArray = [selectedObject(Asc.c_oAscTypeSelectElement.Paragraph, para)];
            api.emit('asc_onFocusObject', sdkArray, true);
            assert.notEqual(store._focusObjects, sdkArray);
            assert.deepEqual(store._focusObjects, sdkArray);
            sdkArray.splice(0, 1);
            assert.equal(store._focusObjects.length, 1);
            assert.equal(store.intf.getParagraphObject(), para);
        });

        it('does not mutate the SDK array', () => {
            const store = focusStore();
            initFocusObjects(store);
            const T = Asc.c_oAscTypeSelectElement;
            const a = selectedObject(T.Paragraph, {}), b = selectedObject(T.Table, {});
            const sdkArray = [a, b];
            api.emit('asc_onFocusObject', sdkArray);
            store.intf.filterFocusObjects();
            store.intf.getTableObject();
            assert.deepEqual(sdkArray, [a, b]);
        });
    });

    // Rules: thumbnail size first, then the two style callbacks.
    describe('DE initEditorStyles', () => {
        it('sets the thumbnail size (330 x 38) before registering the style callbacks', () => {
            const order = [];
            api.asc_setParagraphStylesSizes = (w, h) => order.push(['sizes', w, h]);
            const register = api.asc_registerCallback;
            api.asc_registerCallback = (name, fn) => { order.push(['register', name]); register(name, fn); };
            initEditorStyles(recorder(['initEditorStyles', 'changeParaStyleName']));
            assert.deepEqual(order, [
                ['sizes', 330, 38], ['register', 'asc_onInitEditorStyles'], ['register', 'asc_onParaStyleName'],
            ]);
        });

        it('passes the painter object and the style name (null included) to the store', () => {
            api.asc_setParagraphStylesSizes = () => {};
            const store = recorder(['initEditorStyles', 'changeParaStyleName']);
            const painter = {};
            initEditorStyles(store);
            api.emit('asc_onInitEditorStyles', painter);
            api.emit('asc_onParaStyleName', 'Heading 1');
            api.emit('asc_onParaStyleName', null);
            assert.deepEqual(store.calls, [
                ['initEditorStyles', painter], ['changeParaStyleName', 'Heading 1'], ['changeParaStyleName', null],
            ]);
        });
    });

    // Rule: always clears; re-pulls only when the list had already been fetched.
    describe('DE initTableTemplates', () => {
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

    // Rules: previews for the selected chart's type; cleared for combo types.
    describe('DE updateChartStyles', () => {
        const chartWithType = type => ({ get_ChartProperties: () => ({ getType: () => type }) });

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

        it('does nothing when the chart has no chart properties', () => {
            assert.deepEqual(run({ get_ChartProperties: () => null }), { calls: [], previewCalls: [] });
        });

        it('clears styles for each combo type', () => {
            const t = Asc.c_oAscChartTypeSettings;
            for (const type of [t.comboBarLine, t.comboBarLineSecondary, t.comboAreaBar, t.comboCustom]) {
                assert.deepEqual(run(chartWithType(type)), { calls: [['clearChartStyles']], previewCalls: [] }, type);
            }
        });

        it('updates styles with the previews for any other type', () => {
            const type = Asc.c_oAscChartTypeSettings.barNormal;
            assert.deepEqual(run(chartWithType(type)), {
                calls: [['updateChartStyles', ['preview']]], previewCalls: [type],
            });
        });

        it('reads chartObject when the event fires, not at registration', () => {
            const store = recorder(['clearChartStyles', 'updateChartStyles']);
            const focus = { chartObject: undefined };
            api.asc_getChartPreviews = () => [];
            updateChartStyles(store, focus);
            focus.chartObject = chartWithType(Asc.c_oAscChartTypeSettings.barNormal);
            api.emit('asc_onUpdateChartStyles');
            assert.equal(store.calls.length, 1);
        });
    });
});
