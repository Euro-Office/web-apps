/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Desktop.js reads the editor (window.DE/PE/SSE/...) and the desktop host (window.AscDesktopEditor)
// when it loads, so it is loaded inside before() with stubs in place, and everything is put back after().
define([], function () {
    describe('Common.Controllers.Desktop tab moved to its own window', function () {
        var saved, $name;

        function moveTab(state) {
            window.on_native_message('window:features', JSON.stringify({singlewindow: state}));
        }

        before(function (done) {
            saved = {
                DE: window.DE, PE: window.PE, SSE: window.SSE, PDFE: window.PDFE, VE: window.VE,
                AscDesktopEditor: window.AscDesktopEditor,
                on_native_message: window.on_native_message,
                desktop: Common.Controllers.Desktop,
                utils: Common.Utils
            };
            window.PE = window.SSE = window.PDFE = window.VE = undefined;
            window.DE = {features: {}, getController: function () {}, addListeners: function () {}};
            window.AscDesktopEditor = {execCommand: function () {}};
            Common.Utils = Object.create(saved.utils || {});

            require(['common/main/lib/controller/Desktop'], function () {
                done();
            }, done);
        });

        beforeEach(function () {
            $name = $('<span id="title-doc-name">a long file name.docx</span>').appendTo('body');
        });

        afterEach(function () {
            moveTab(false);
            $name.remove();
        });

        after(function () {
            ['DE', 'PE', 'SSE', 'PDFE', 'VE', 'AscDesktopEditor', 'on_native_message'].forEach(function (name) {
                window[name] = saved[name];
            });
            Common.Controllers.Desktop = saved.desktop;
            Common.Utils = saved.utils;
            $('body').removeClass('desktop-singlewindow');
        });

        it('hides the page title on Windows and Linux, where the window draws the name', function () {
            Common.Utils.isMac = false;
            moveTab(true);
            assert.isFalse($name.is(':visible'));
            assert.isTrue($('body').hasClass('desktop-singlewindow'));

            moveTab(false);
            assert.isTrue($name.is(':visible'), 'shown again when the tab goes back');
            assert.isFalse($('body').hasClass('desktop-singlewindow'));
        });

        it('keeps the page title on macOS, where the window title is hidden', function () {
            Common.Utils.isMac = true;
            moveTab(true);
            assert.isTrue($name.is(':visible'));
            assert.isFalse($('body').hasClass('desktop-singlewindow'));
        });
    });
});
