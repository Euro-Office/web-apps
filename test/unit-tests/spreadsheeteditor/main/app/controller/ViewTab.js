/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 *  ViewTab.js
 *
 *  Unit test of the spreadsheet View tab controller: the Dark document filter and button.
 *
 */

// The controller module reads SSE.Controllers when it is evaluated, and its view module
// pulls in the whole editor toolbar. The namespace and the view stand-in are set up here,
// before the dependencies below load, so requirejs uses them instead of the real view.
window.SSE = window.SSE || {};
SSE.Controllers = SSE.Controllers || {};
SSE.Views = SSE.Views || {};

define('spreadsheeteditor/main/app/view/ViewTab', [], function () {});
define('core', ['common/main/lib/core/application'], function () {});

define([
    'common/main/lib/component/Button',
    'spreadsheeteditor/main/app/controller/ViewTab'
], function () {
    describe('SSE.Controllers.ViewTab, Dark document', function () {
        var savedNotificationCenter, savedThemes, savedEnumLock,
            theme;

        // Common.UI.Themes as the controller reads it: the interface theme and the shared
        // "dark document" setting
        function fakeThemes() {
            return {
                isDarkTheme: function () { return theme.dark; },
                isContentThemeDark: function () { return theme.contentDark; },
                getThemeColors: function () { return { type: theme.dark ? 'dark' : 'light' }; },
                available: function () { return false; }
            };
        }

        // Stand-in for the View tab, reduced to what the lock tests depend on. Like the real
        // view (view/ViewTab.js): the button carries the same lock list, since lockControls
        // ignores a cause missing from it, and SetDisabled disables every locked control.
        // These tests check the controller's side of the locks; the lock list of the real
        // button is not covered here.
        function standInView() {
            var btn = new Common.UI.Button({
                lock: [Common.enumLock.inLightTheme, Common.enumLock.lostConnect, Common.enumLock.disableOnStart],
                enableToggle: true
            });
            return {
                btnDarkDocument: btn,
                lockedControls: [btn],
                SetDisabled: function (state) {
                    this.lockedControls.forEach(function (button) {
                        button.setDisabled(state);
                    });
                }
            };
        }

        // The View tab of an editor, without the toolbar setConfig builds around it
        function createControllerWithView() {
            var controller = createController();
            controller.setApi(fakeApi());
            controller.view = standInView();
            controller.updateDarkDocumentButton();
            return controller;
        }

        function fakeApi() {
            return {
                skins: [],
                asc_registerCallback: function () {},
                asc_setSkin: function (colors) { this.skins.push(colors); }
            };
        }

        function createController() {
            var controller = new SSE.Controllers.ViewTab();
            controller.onLaunch();
            return controller;
        }

        function filterClasses() {
            return ['canvas-dark-filter', 'canvas-dark-filter-objects'].filter(function (cls) {
                return document.body.classList.contains(cls);
            });
        }

        beforeEach(function () {
            // Each controller subscribes to the notification center when launched, so every
            // test gets its own
            savedNotificationCenter = Common.NotificationCenter;
            Common.NotificationCenter = _.extend({}, Backbone.Events);
            savedThemes = Common.UI.Themes;
            Common.UI.Themes = fakeThemes();
            theme = { dark: true, contentDark: true };
            // Common.enumLock is filled by the spreadsheet Toolbar view, which is not loaded
            savedEnumLock = Common.enumLock;
            Common.enumLock = { inLightTheme: 'light-theme', lostConnect: 'disconnect', disableOnStart: 'on-start' };
        });

        afterEach(function () {
            Common.NotificationCenter = savedNotificationCenter;
            Common.UI.Themes = savedThemes;
            Common.enumLock = savedEnumLock;
            document.body.classList.remove('canvas-dark-filter', 'canvas-dark-filter-objects');
            document.documentElement.style.removeProperty('--canvas-cell-title-background');
        });

        // The embedded editors (chart data, OLE, mail merge) launch this controller but never
        // give it the api. The setting is shared by every editor, so they still receive its events.
        it('without an api, never applies the filter', function () {
            createController();

            Common.NotificationCenter.trigger('contenttheme:dark', true);
            Common.NotificationCenter.trigger('uitheme:changed');

            assert.deepEqual(filterClasses(), []);
        });

        // Counterpart of the test above: the same setting with an api applies the filter and
        // sends the light theme's header colors, read from :root. The page loads no theme CSS,
        // so only the token set here has a value; the others are missing.
        it('with an api, applies the filter and sends the light canvas chrome', function () {
            document.documentElement.style.setProperty('--canvas-cell-title-background', '#f7f7f7');
            var api = fakeApi();
            createController().setApi(api);

            assert.deepEqual(filterClasses(), ['canvas-dark-filter', 'canvas-dark-filter-objects']);
            assert.lengthOf(api.skins, 1);
            assert.equal(api.skins[0]['canvas-cell-title-background'], '#f7f7f7', 'light token sent');
            assert.notProperty(api.skins[0], 'canvas-cell-title-text', 'missing token keeps the current color');
            assert.equal(api.skins[0]['ColorFiltering'], '#008636', 'light filtered row number color');
        });

        // In view mode the toolbar does not lock its controls on a disconnect, so the button
        // relies on its own lostConnect lock. A theme change or a setting changed in another
        // tab updates the inLightTheme lock, which must not release it.
        it('after a disconnect, stays disabled through a theme or setting change', function () {
            var btn = createControllerWithView().view.btnDarkDocument;
            assert.isFalse(btn.isDisabled(), 'enabled before the disconnect');

            Common.NotificationCenter.trigger('api:disconnect');
            assert.isTrue(btn.isDisabled(), 'disabled by the disconnect');

            Common.NotificationCenter.trigger('uitheme:changed');
            assert.isTrue(btn.isDisabled(), 'after a theme change');

            theme.contentDark = false;
            Common.NotificationCenter.trigger('contenttheme:dark', false);
            assert.isTrue(btn.isDisabled(), 'after the setting changed in another tab');
        });

        // Dark document applies in dark interface themes only
        it('is locked in a light interface theme, also together with a disconnect', function () {
            theme.dark = false;
            var btn = createControllerWithView().view.btnDarkDocument;
            assert.isTrue(btn.isDisabled(), 'locked when the editor opens in a light theme');

            theme.dark = true;
            Common.NotificationCenter.trigger('uitheme:changed');
            assert.isFalse(btn.isDisabled(), 'unlocked in a dark theme');

            theme.dark = false;
            Common.NotificationCenter.trigger('uitheme:changed');
            assert.isTrue(btn.isDisabled(), 'locked again in a light theme');

            Common.NotificationCenter.trigger('api:disconnect');
            theme.dark = true;
            Common.NotificationCenter.trigger('uitheme:changed');
            assert.isTrue(btn.isDisabled(), 'still locked by the disconnect in a dark theme');
        });
    });
});
