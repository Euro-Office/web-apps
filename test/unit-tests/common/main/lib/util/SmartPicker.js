/*!
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH or an Nextcloud affiliate company and Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
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

        describe('triggerStillThere', function () {

            // The word part before the caret, which is what asc_GetCurrentWord(-1)
            // returns. "/" is punctuation, so it is not part of that word.
            var apiWith = function (wordBeforeCaret) {
                return {asc_GetCurrentWord: function () { return wordBeforeCaret; }};
            };

            it('permits the deletion when the query is still before the caret', function () {
                assert.strictEqual(SmartPicker.triggerStillThere(apiWith('pro'), '/pro'), true);
            });

            it('refuses when something else is there now', function () {
                // A co-editor's change, or the user clicking elsewhere: deleting
                // here would eat characters that are not the trigger.
                assert.strictEqual(SmartPicker.triggerStillThere(apiWith('bar'), '/pro'), false);
                assert.strictEqual(SmartPicker.triggerStillThere(apiWith(''), '/pro'), false);
                assert.strictEqual(SmartPicker.triggerStillThere(apiWith('prox'), '/pro'), false);
            });

            it('handles a bare "/" with nothing typed after it', function () {
                // A caret sitting right after punctuation has no word before it.
                assert.strictEqual(SmartPicker.triggerStillThere(apiWith(''), '/'), true);
                assert.strictEqual(SmartPicker.triggerStillThere(apiWith('word'), '/'), false);
            });

            it('permits it where the editor cannot be asked', function () {
                // asc_GetCurrentWord is exported by word/api.js only. Presentation
                // and Spreadsheet keep the previous behaviour rather than lose the
                // feature; they must not start refusing every deletion.
                assert.strictEqual(SmartPicker.triggerStillThere({}, '/pro'), true);
                assert.strictEqual(SmartPicker.triggerStillThere(null, '/pro'), true);
            });

            it('permits it when the probe throws', function () {
                var api = {asc_GetCurrentWord: function () { throw new Error('boom'); }};
                assert.strictEqual(SmartPicker.triggerStillThere(api, '/pro'), true);
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

            it('survives a person taking their time in the picker', function () {
                // The failure this pins down: the picker is a modal in front of
                // the editor, so nothing clears the record while it is open, and
                // expiring mid-flow does not fail safe -- the link still gets
                // inserted while the trigger text stays in the document. Two
                // minutes is an ordinary amount of time to spend searching a name
                // or being interrupted; it used to be past the limit.
                var pending = SmartPicker.createPending();
                var realNow = Date.now;
                try {
                    var now = 1000000;
                    Date.now = function () { return now; };
                    pending.begin('/pro');
                    now += 120000;
                    assert.strictEqual(pending.isPending(), true);
                    assert.strictEqual(pending.consume(), '/pro');
                } finally {
                    Date.now = realNow;
                }
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
