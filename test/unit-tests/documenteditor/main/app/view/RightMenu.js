/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 *  RightMenu.js
 *
 *  Unit test
 *
 *  Covers the width a plugin panel opens at in the right menu: the width the
 *  plugin requests, kept within the viewport resizer range, unless the user
 *  dragged one.
 *
 */

// The view registers itself on the DE namespace and asks the Viewport
// controller for the layout when a panel opens.
window.DE = window.DE || { Views: {} };
DE.getController = function () {
    return { getView: function () { return { hlayout: { hideItemResizer: function () {} } }; } };
};

define([
    'backbone',
    'documenteditor/main/app/view/RightMenu'
], function () {
    var STORAGE_KEY = 'de-rightmenu-width';

    describe('DE.Views.RightMenu plugin panel width', function () {
        var view, stored, saved;

        var openPlugin = function (pluginWidth) {
            var btn = new Common.UI.Button({ type: 'plugin', enableToggle: true, pluginWidth: pluginWidth });
            btn.pressed = true;
            view.onBtnMenuClick(btn);
            return view.$el.width();
        };

        before(function () {
            saved = { localStorage: Common.localStorage, Utils: Common.Utils };
            Common.localStorage = {
                getItem: function (key) { return stored.hasOwnProperty(key) ? stored[key] : null; },
                setItem: function (key, value) { stored[key] = String(value); }
            };
            var settings = {};
            Common.Utils = _.extend({}, Common.Utils, {
                InternalSettings: {
                    get: function (key) { return settings[key]; },
                    set: function (key, value) { settings[key] = value; }
                }
            });
        });

        after(function () {
            Common.localStorage = saved.localStorage;
            Common.Utils = saved.Utils;
        });

        beforeEach(function () {
            stored = {};
            view = Object.create(DE.Views.RightMenu.prototype);
            view.setElement($('<div style="box-sizing: content-box;"><div class="right-panel" style="padding: 0 44px 0 3px;"></div></div>').appendTo('body'));
            view.minimizedMode = false;
        });

        afterEach(function () {
            view.$el.remove();
        });

        it('opens at the requested width plus the panel paddings', function () {
            assert.equal(openPlugin(400), 447);
        });

        it('keeps a small requested width at the resizer minimum', function () {
            assert.equal(openPlugin(100), 260);
        });

        it('keeps a large requested width at the resizer maximum', function () {
            assert.equal(openPlugin(900), 600);
        });

        it('opens at the base width when the plugin requests none', function () {
            assert.equal(openPlugin(undefined), 220 + 47);
        });

        it('prefers the width the user dragged', function () {
            stored[STORAGE_KEY] = '333';
            assert.equal(openPlugin(500), 333);
        });

        it('does not store a width when a plugin opens', function () {
            openPlugin(400);
            assert.notProperty(stored, STORAGE_KEY);
        });
    });
});
