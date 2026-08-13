/*
 * (c) Copyright Ascensio System SIA 2010-2024
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

/**
 *  SmartPicker.js
 *
 *  Unit test
 *
 *  Runs two ways, over one copy of the assertions:
 *
 *    - test/unit-tests/common/index.html, served over http (requirejs cannot
 *      load modules from file:// -- Chrome gives every file: URL its own opaque
 *      origin). From the repo root:  npx http-server -p 8000 .
 *      then open http://localhost:8000/test/unit-tests/common/
 *    - node --test test/unit-tests/common/main/lib/util/SmartPicker.js
 *
 *  The functions covered are pure, so the node path needs nothing but a small
 *  AMD shim to evaluate the module.
 */
(function (factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        // The module assigns onto the Common global at evaluation time. This
        // runs while the test file is being evaluated, i.e. before requirejs
        // resolves the dependency below, so the namespace is ready in time.
        window.Common = window.Common || {};
        define(['common/main/lib/util/SmartPicker'], function (SmartPicker) {
            // describe/it are mocha globals; assert is set by test/unit-tests/common.js.
            factory(SmartPicker, window.assert, window.describe, window.it);
        });
    } else {
        var nodeTest = require('node:test');
        var fs = require('node:fs');
        var path = require('node:path');
        var source = path.resolve(
            __dirname, '../../../../../../apps/common/main/lib/util/SmartPicker.js');

        var sandbox = {Common: {}};
        // eslint-disable-next-line no-new-func
        new Function('define', 'Common', fs.readFileSync(source, 'utf8'))(
            function (deps, moduleFactory) { moduleFactory(); }, sandbox.Common);

        factory(sandbox.Common.Utils.SmartPicker, require('node:assert'),
            nodeTest.describe, nodeTest.it);
    }
}(function (SmartPicker, assert, describe, it) {
    'use strict';

    describe('Common.Utils.SmartPicker', function () {

        describe('slashCanTrigger', function () {
            // Mirrors @tiptap/suggestion with allowedPrefixes: [' '], which is
            // how Nextcloud's Text app configures the same trigger.
            var can = function (prev) { return SmartPicker.slashCanTrigger(prev); };

            it('fires at the start of the input', function () {
                assert.strictEqual(can(undefined), true);
            });

            it('fires after a space or a non-breaking space', function () {
                assert.strictEqual(can(' '), true);
                assert.strictEqual(can(' '), true);
            });

            it('fires after a newline', function () {
                assert.strictEqual(can('Enter'), true);
            });

            it('does not fire mid-word', function () {
                assert.strictEqual(can('a'), false);
                assert.strictEqual(can('7'), false);
                assert.strictEqual(can('.'), false);
            });

            it('does not fire after another slash, so "//" stays literal', function () {
                assert.strictEqual(can('/'), false);
            });

            it('never treats a modifier as the preceding character', function () {
                // The German-layout regression: "/" is Shift+7, and recording
                // Shift would hide the space that actually preceded it.
                var keys = ['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock'];
                for (var i = 0; i < keys.length; i++) {
                    assert.strictEqual(can(keys[i]), false, keys[i] + ' must not trigger');
                }
            });
        });

        describe('sanitizeIconUrl', function () {
            var clean = function (url) { return SmartPicker.sanitizeIconUrl(url); };

            it('accepts the shapes Nextcloud actually sends', function () {
                assert.strictEqual(clean('https://cloud.example/apps/files/img/app.svg'),
                    'https://cloud.example/apps/files/img/app.svg');
                assert.strictEqual(clean('http://cloud.example/i.png'),
                    'http://cloud.example/i.png');
                assert.strictEqual(clean('/apps/deck/img/deck-dark.svg'),
                    '/apps/deck/img/deck-dark.svg');
                assert.strictEqual(clean('data:image/svg+xml;base64,PHN2Zy8+'),
                    'data:image/svg+xml;base64,PHN2Zy8+');
            });

            it('drops attribute-breaking characters', function () {
                // MenuItem renders <img src="<%= iconImg %>"> with an unescaped
                // interpolation, so a quote in the url escapes the attribute.
                assert.strictEqual(clean('https://x/i.png" onerror="alert(1)'), '');
                assert.strictEqual(clean("https://x/i.png' onerror='alert(1)"), '');
                assert.strictEqual(clean('https://x/i.png"><script>x</script>'), '');
            });

            it('drops non-image and script-bearing schemes', function () {
                assert.strictEqual(clean('javascript:alert(1)'), '');
                assert.strictEqual(clean('data:text/html;base64,PHNjcmlwdD4='), '');
                assert.strictEqual(clean('//evil.example/i.png'), '');
            });

            it('drops non-strings and empty values', function () {
                assert.strictEqual(clean(undefined), '');
                assert.strictEqual(clean(null), '');
                assert.strictEqual(clean(''), '');
                assert.strictEqual(clean({}), '');
            });
        });

        describe('createPending', function () {

            it('reports nothing outstanding before a request', function () {
                var pending = SmartPicker.createPending();
                assert.strictEqual(pending.isPending(), false);
                // null, not '': an unrelated insertLink must delete nothing.
                assert.strictEqual(pending.consume(), null);
            });

            it('returns the text to delete, exactly once', function () {
                var pending = SmartPicker.createPending();
                pending.begin('/fil');
                assert.strictEqual(pending.isPending(), true);
                assert.strictEqual(pending.consume(), '/fil');
                assert.strictEqual(pending.consume(), null);
            });

            it('deletes nothing after a cancelled request', function () {
                var pending = SmartPicker.createPending();
                pending.begin('/fil');
                pending.clear();
                assert.strictEqual(pending.consume(), null);
            });

            it('expires a stale request instead of eating a character', function () {
                var pending = SmartPicker.createPending();
                var realNow = Date.now;
                try {
                    var now = 1000000;
                    Date.now = function () { return now; };
                    pending.begin('/fil');
                    now += SmartPicker.PENDING_TIMEOUT + 1;
                    assert.strictEqual(pending.isPending(), false);
                    assert.strictEqual(pending.consume(), null);
                } finally {
                    Date.now = realNow;
                }
            });
        });
    });
}));
