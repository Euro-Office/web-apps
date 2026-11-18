/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// The controller only needs the view module to exist; the view itself is stubbed below.
window.DE = window.DE || {};
DE.Controllers = DE.Controllers || {};
DE.Views = DE.Views || {};
define('documenteditor/main/app/view/ViewTab', [], function () {});

define([
    'documenteditor/main/app/controller/ViewTab'
], function () {
    describe('DE.Controllers.ViewTab pageless and multiple pages', function () {
        var controller, listeners, calls, storage, fired, previousStorage;

        function toggleButton() {
            return {
                pressed: false,
                toggle: function (state) { this.pressed = !!state; }
            };
        }

        beforeEach(function () {
            calls = [];
            storage = {};
            fired = [];
            previousStorage = Common.localStorage;
            Common.localStorage = {setBool: function (key, value) { storage[key] = value; }};

            var view = {
                btnMultiplePages: toggleButton(),
                btnPageless: toggleButton(),
                fireEvent: function (name, args) { fired.push([name].concat(args)); }
            };
            controller = Object.create(DE.Controllers.ViewTab.prototype);
            controller.createView = function () { return view; };
            controller.addListeners = function (map) { listeners = map; };
            controller.setConfig({mode: {}, toolbar: {toolbar: {}}});
            controller.api = {
                zoomCustomMode: function () { calls.push(['zoomCustomMode']); },
                SetMultipageViewMode: function (value) { calls.push(['SetMultipageViewMode', value]); },
                SetPagelessMode: function (value) { calls.push(['SetPagelessMode', value]); }
            };
        });

        afterEach(function () {
            Common.localStorage = previousStorage;
        });

        it('turns multiple pages off when pageless is switched on', function () {
            controller.view.btnMultiplePages.pressed = true;

            controller.onPagelessMode(true);

            assert.deepInclude(calls, ['SetMultipageViewMode', false]);
            assert.deepInclude(calls, ['SetPagelessMode', true]);
            assert.isFalse(controller.view.btnMultiplePages.pressed, 'multiple pages button released');
            assert.isTrue(controller.view.btnPageless.pressed, 'pageless button pressed');
            assert.deepInclude(fired, ['pages:multiplechanged', false], 'statusbar button synced');
            assert.deepEqual(storage, {'de-zoom-multipage': false, 'de-pageless-mode': true});
        });

        it('turns pageless off when multiple pages is switched on from the view tab', function () {
            controller.view.btnPageless.pressed = true;

            controller.onMultiplePages(true);

            assert.deepInclude(calls, ['SetPagelessMode', false]);
            assert.deepInclude(calls, ['SetMultipageViewMode', true]);
            assert.isFalse(controller.view.btnPageless.pressed, 'pageless button released');
            assert.deepEqual(storage, {'de-pageless-mode': false, 'de-zoom-multipage': true});
        });

        it('turns pageless off when multiple pages is switched on from the statusbar', function () {
            controller.view.btnPageless.pressed = true;

            listeners.Statusbar['pages:multiplechanged'](true);

            assert.deepInclude(calls, ['SetPagelessMode', false]);
            assert.isFalse(controller.view.btnPageless.pressed, 'pageless button released');
            assert.isTrue(controller.view.btnMultiplePages.pressed, 'multiple pages button pressed');
            assert.isFalse(storage['de-pageless-mode']);
        });

        it('leaves multiple pages alone when pageless is switched off', function () {
            controller.view.btnMultiplePages.pressed = true;

            controller.onPagelessMode(false);

            assert.notDeepInclude(calls, ['SetMultipageViewMode', false]);
            assert.isTrue(controller.view.btnMultiplePages.pressed);
            assert.deepEqual(storage, {'de-pageless-mode': false});
        });
    });
});
