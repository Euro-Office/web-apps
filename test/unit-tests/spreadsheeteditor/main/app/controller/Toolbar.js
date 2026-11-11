/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

define([], function () {
    describe('SSE.Controllers.Toolbar Insert > Checkbox', function () {
        var controller, calls;

        before(function (done) {
            // Only the handlers are under test: stub the editor bootstrap the
            // controller module pulls in.
            define('sse-toolbar-stub', [], function () {});
            var stub = {};
            ['core', 'common/main/lib/component/Window', 'common/main/lib/util/SmartPicker',
             'common/main/lib/view/SmartPickerMenu', 'common/main/lib/view/SearchBar',
             'spreadsheeteditor/main/app/view/define', 'spreadsheeteditor/main/app/view/Toolbar',
             'spreadsheeteditor/main/app/collection/TableTemplates', 'spreadsheeteditor/main/app/controller/PivotTable'
            ].forEach(function (id) { stub[id] = 'sse-toolbar-stub'; });
            require.config({map: {'spreadsheeteditor/main/app/controller/Toolbar': stub}});

            window.SSE = window.SSE || {};
            SSE.Controllers = SSE.Controllers || {};
            Backbone.Controller = Backbone.Controller || {extend: Backbone.Model.extend};
            require(['spreadsheeteditor/main/app/controller/Toolbar'], function () { done(); }, done);
        });

        beforeEach(function () {
            calls = [];
            controller = Object.create(SSE.Controllers.Toolbar.prototype);
            controller.toolbar = {};
            controller.api = {
                asc_insertCheckbox: function () { calls.push('asc_insertCheckbox'); },
                asc_addCheckBoxOnSheet: function () { calls.push('asc_addCheckBoxOnSheet'); }
            };
        });

        it('inserts a cell checkbox on a plain button click', function () {
            controller.onInsertCheckBoxClick({}, $.Event('click'));
            assert.deepEqual(calls, ['asc_insertCheckbox']);
        });

        it('inserts a cell checkbox from the "Cell checkbox" menu item', function () {
            controller.onInsertCheckBoxClick({}, {value: 'cell'});
            assert.deepEqual(calls, ['asc_insertCheckbox']);
        });

        it('inserts a form control from the "Form control checkbox" menu item', function () {
            controller.onInsertCheckBoxClick({}, {value: 'form'});
            assert.deepEqual(calls, ['asc_addCheckBoxOnSheet']);
        });
    });
});
