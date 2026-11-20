/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Desktop.js reads the editor (window.DE/PE/SSE/...) and the desktop host (window.AscDesktopEditor)
// when it loads, so it is loaded inside before() with stubs in place, and everything is put back after().
define([], function () {
    describe('Common.Controllers.Desktop autosave of the file', function () {
        var saved, stubs, tick, now, api, editing;

        before(function (done) {
            saved = {
                DE: window.DE, PE: window.PE, SSE: window.SSE, PDFE: window.PDFE, VE: window.VE,
                AscDesktopEditor: window.AscDesktopEditor,
                on_native_message: window.on_native_message,
                setInterval: window.setInterval,
                dateNow: Date.now,
                desktop: Common.Controllers.Desktop,
                themes: Common.UI.Themes,
                storage: Common.localStorage,
                locale: Common.Locale.getDefaultLanguage,
                localeCurrent: Common.Locale.getCurrentLanguage
            };

            api = {
                isDocumentModified: function () { return true; },
                asc_registerCallback: function () {},
                asc_getCellEditMode: function () { return editing; },
                asc_Save: function () { api.saves++; },
                saves: 0
            };
            var main = {api: api, appOptions: {isOffline: true, isEdit: true}};

            window.DE = window.PE = window.PDFE = window.VE = undefined;
            window.SSE = {
                features: {},
                getController: function (name) { return name === 'Main' ? main : undefined; },
                addListeners: function () {}
            };
            window.AscDesktopEditor = {
                execCommand: function () {},
                LocalFileGetSaved: function () { return true; },
                LocalFileGetSourcePath: function () { return 'C:\\files\\table.xlsx'; }
            };
            Common.UI.Themes = {setAvailable: function () {}};
            Common.localStorage = {getItem: function (key) { return key === 'app-settings-autosave-file-minutes' ? '1' : null; }};
            Common.Locale.getDefaultLanguage = Common.Locale.getCurrentLanguage = function () { return 'en'; };
            now = 1000000;
            Date.now = function () { return now; };
            // catch the autosave timer instead of letting it run
            window.setInterval = function (fn) { tick = fn; return 1; };

            require(['common/main/lib/controller/Desktop'], function () {
                Common.Controllers.Desktop.init({isDesktopApp: true});
                Common.NotificationCenter.trigger('document:ready');
                window.setInterval = saved.setInterval;
                done();
            }, done);
        });

        after(function () {
            ['DE', 'PE', 'SSE', 'PDFE', 'VE', 'AscDesktopEditor', 'on_native_message'].forEach(function (name) {
                window[name] = saved[name];
            });
            window.setInterval = saved.setInterval;
            Date.now = saved.dateNow;
            Common.Controllers.Desktop = saved.desktop;
            Common.UI.Themes = saved.themes;
            Common.localStorage = saved.storage;
            Common.Locale.getDefaultLanguage = saved.locale;
            Common.Locale.getCurrentLanguage = saved.localeCurrent;
        });

        it('starts the autosave timer when the document is ready', function () {
            assert.isFunction(tick);
        });

        it('does not save while a spreadsheet cell is being edited', function () {
            editing = true;
            now += 2 * 60000;
            tick();
            assert.equal(api.saves, 0, 'asc_Save would commit the cell the user is writing');
        });

        it('saves once the cell is left', function () {
            editing = false;
            tick();
            assert.equal(api.saves, 1);
        });
    });
});
