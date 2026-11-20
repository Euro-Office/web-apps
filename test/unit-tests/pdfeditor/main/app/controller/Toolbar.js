/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

define([], function () {
    describe('PDFE.Controllers.Toolbar saved signatures menu', function () {
        var controller, menu, $group, stored, saved = {};
        var png = 'data:image/png;base64,AAAA';

        before(function (done) {
            // Only the signature handlers are under test: stub the editor bootstrap the
            // controller module pulls in.
            define('pdfe-toolbar-stub', [], function () {});
            var stub = {};
            ['core', 'common/main/lib/component/Window', 'pdfeditor/main/app/view/Toolbar'
            ].forEach(function (id) { stub[id] = 'pdfe-toolbar-stub'; });
            require.config({map: {'pdfeditor/main/app/controller/Toolbar': stub}});

            window.PDFE = window.PDFE || {};
            PDFE.Controllers = PDFE.Controllers || {};
            Backbone.Controller = Backbone.Controller || {extend: Backbone.Model.extend};
            require(['pdfeditor/main/app/controller/Toolbar'], function () { done(); }, done);
        });

        beforeEach(function () {
            saved.localStorage = Common.localStorage;
            saved.Utils = Common.Utils;
            saved.Menu = Common.UI.Menu;
            stored = {};
            Common.localStorage = {
                getItem: function (key) { return stored[key] || null; },
                setItem: function (key, value) { stored[key] = value; }
            };
            Common.Utils = Common.Utils || {};
            Common.Utils.String = Common.Utils.String || {
                format: function (s) {
                    var args = arguments;
                    return s.replace(/\{(\d+)\}/g, function (m, i) { return args[+i + 1]; });
                }
            };
            // the "Delete signature" submenu: only its items matter here
            Common.UI.Menu = function (options) { this.items = options.items; };
            Common.UI.Menu.prototype.on = function () { return this; };

            controller = Object.create(PDFE.Controllers.Toolbar.prototype);
            controller.toolbar = {
                txtSignatureN: 'Signature {0}',
                txtNoSignature: 'No saved signature yet',
                txtNewSignature: 'New signature',
                txtDeleteSignature: 'Delete signature'
            };
            menu = {
                items: [],
                cleared: 0,
                removeAll: function () { this.items = []; this.cleared++; },
                addItem: function (item) { this.items.push(item); }
            };
            // the same wiring as Common.UI.Menu: show.bs.dropdown on the button group raises show:before
            $group = $('<div class="btn-group"><ul class="dropdown-menu" role="menu"><li class="dropdown-submenu"></li></ul></div>').appendTo('body');
            $group.on('show.bs.dropdown', function (e) { controller.fillSignatureMenu(menu, e); });
            stored['pdfe-signatures'] = JSON.stringify([png, null, png]);
        });

        afterEach(function () {
            $group.remove();
            Common.localStorage = saved.localStorage;
            Common.Utils = saved.Utils;
            Common.UI.Menu = saved.Menu;
        });

        it('fills the menu when the Signature button opens it', function () {
            $group.trigger('show.bs.dropdown');

            assert.equal(menu.cleared, 1);
            var captions = menu.items.map(function (item) { return item.caption; });
            assert.deepEqual(captions, ['Signature 1', 'Signature 3', '--', 'New signature', 'Delete signature']);
            var del = menu.items[4].menu.items.map(function (item) { return item.value; });
            assert.deepEqual(del, [{action: 'delete', index: 0}, {action: 'delete', index: 2}]);
        });

        it('keeps the menu when the "Delete signature" submenu opens', function () {
            $group.trigger('show.bs.dropdown');
            var before = menu.items;

            // hovering the submenu item fires show.bs.dropdown on its <li>, which bubbles to the button group
            $group.find('li.dropdown-submenu').trigger('show.bs.dropdown');

            assert.equal(menu.cleared, 1, 'the items are not rebuilt');
            assert.strictEqual(menu.items, before, 'the item with the submenu stays in place');
        });

        it('deletes only the chosen signature', function () {
            controller.onSignatureMenu(null, {value: {action: 'delete', index: 2}});

            assert.deepEqual(JSON.parse(stored['pdfe-signatures']), [png, null, null]);
        });
    });
});
