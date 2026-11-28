/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

define([
    'common/main/lib/controller/Plugins',
    'common/main/lib/component/Button',
    'common/main/lib/component/Menu'
], function () {
    describe('Common.Controllers.Plugins toolbar reset', function () {
        var controller, view, panel, previousLocks, previousThemes, previousLaunch;

        beforeEach(function () {
            // The application installs the Backbone view show/hide helpers.
            new Backbone.Application({nameSpace: 'PluginsUnitTests', autoCreate: false});
            previousLocks = Common.enumLock;
            previousThemes = Common.UI.Themes;
            previousLaunch = Common.Controllers.LaunchController;
            Common.enumLock = {};
            Common.UI.Themes = {getThemeProps: function () {}};
            Common.Controllers.LaunchController = {isScriptLoaded: function () { return true; }};
            panel = $('<div></div>').appendTo('body');
            view = new Common.Views.Plugins({});
            controller = Object.create(Common.Controllers.Plugins.prototype);
            _.extend(controller, {
                customButtonsArr: [],
                appOptions: {},
                $toolbarPanelPlugins: panel,
                viewPlugins: view,
                // These SDK operations do not participate in building the toolbar.
                refreshPluginsList: function () {},
                runAutoStartPlugins: function () {}
            });
        });

        afterEach(function () {
            view.lockedControls.forEach(function (button) { button.remove(); });
            view.remove();
            panel.remove();
            Common.enumLock = previousLocks;
            Common.UI.Themes = previousThemes;
            Common.Controllers.LaunchController = previousLaunch;
            delete window.PluginsUnitTests;
        });

        function backgroundPlugin() {
            return new Backbone.Model({isBackgroundPlugin: true, groupRank: 0});
        }

        function reset(models) {
            controller.onResetPlugins(new Backbone.Collection(models));
        }

        function assertBackgroundButton() {
            var button = panel.find('[id="id-toolbar-btn-background-plugin"]');
            assert.lengthOf(button, 1, 'one background button is attached to the current panel');
            assert.notEqual(button.css('display'), 'none', 'the background button is shown');
        }

        it('creates the button when the store contains only a background plugin', function () {
            reset([backgroundPlugin()]);

            assertBackgroundButton();
        });

        it('reattaches the button when a background-only store is reset again', function () {
            reset([backgroundPlugin()]);
            reset([backgroundPlugin()]);

            assertBackgroundButton();
        });

        [0, 1, 2].forEach(function (rank) {
            it('keeps one background button alongside a regular plugin with rank ' + rank, function () {
                view.createPluginButton = function () {
                    return new Common.UI.Button({caption: 'Regular plugin'});
                };
                reset([new Backbone.Model({groupRank: rank}), backgroundPlugin()]);

                assertBackgroundButton();
            });
        });

        it('keeps the button when the last regular plugin is removed', function () {
            view.createPluginButton = function () {
                return new Common.UI.Button({caption: 'Regular plugin'});
            };
            reset([new Backbone.Model({groupRank: 0}), backgroundPlugin()]);
            reset([backgroundPlugin()]);

            assertBackgroundButton();
        });

        it('does not create a background button for an empty store', function () {
            reset([]);

            assert.lengthOf(panel.find('[id="id-toolbar-btn-background-plugin"]'), 0);
            assert.isFalse(controller.appOptions.canPlugins);
        });
    });

    describe('Common.Controllers.Plugins autostart on reset', function () {
        var AUTOSTART_GUID = 'asc.{11111111-2222-4333-8444-555555555555}';
        var controller, started, scriptsLoaded, previousLaunch;

        beforeEach(function () {
            previousLaunch = Common.Controllers.LaunchController;
            scriptsLoaded = false;
            Common.Controllers.LaunchController = {isScriptLoaded: function () { return scriptsLoaded; }};
            started = [];
            controller = Object.create(Common.Controllers.Plugins.prototype);
            _.extend(controller, {
                customButtonsArr: [],
                appOptions: {},
                autostart: [AUTOSTART_GUID],
                pluginsWinToShow: [],
                api: {asc_pluginRun: function (guid) { started.push(guid); }},
                // Registering the plugins with the SDK does not start them.
                refreshPluginsList: function () {}
            });
        });

        afterEach(function () {
            Common.Controllers.LaunchController = previousLaunch;
        });

        function reset() {
            controller.onResetPlugins(new Backbone.Collection([new Backbone.Model({isBackgroundPlugin: true, groupRank: 0})]));
        }

        it('waits for the editor scripts before starting an autostart plugin', function () {
            reset();
            assert.deepEqual(started, [], 'no plugin runs before the scripts are loaded');

            scriptsLoaded = true;
            controller.onPostLoadComplete();

            assert.deepEqual(started, [AUTOSTART_GUID]);
        });

        it('starts an autostart plugin at once when the editor scripts are loaded', function () {
            scriptsLoaded = true;

            reset();

            assert.deepEqual(started, [AUTOSTART_GUID]);
        });
    });
});
