/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

define([], function () {
    describe('SSE.Controllers.DocumentHolder Remove Checkbox', function () {
        before(function (done) {
            // The extension patches the real controller's prototype; a bare one is enough here.
            window.SSE = window.SSE || {};
            SSE.Controllers = SSE.Controllers || {};
            SSE.Controllers.DocumentHolder = SSE.Controllers.DocumentHolder || function () {};
            window.Asc = window.Asc || {};
            Asc.c_oAscChartTypeSettings = Asc.c_oAscChartTypeSettings || {};
            require(['spreadsheeteditor/main/app/controller/DocumentHolderExt'], function () { done(); }, done);
        });

        it('removes the checkbox from the selected cells', function () {
            var calls = [];
            var controller = Object.create(SSE.Controllers.DocumentHolder.prototype);
            controller.api = {asc_removeCheckbox: function () { calls.push('asc_removeCheckbox'); }};

            controller.onRemoveCheckbox();

            assert.deepEqual(calls, ['asc_removeCheckbox']);
        });
    });
});
