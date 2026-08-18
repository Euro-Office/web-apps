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

            it('drops a backslash disguised as a host-relative path', function () {
                // Browsers normalise "\" to "/" when parsing a url, so
                // "/\evil.example/i.png" is the protocol-relative
                // "//evil.example/i.png" -- a foreign origin behind a string
                // that reads as same-origin.
                assert.strictEqual(clean('/\\evil.example/i.png'), '');
                assert.strictEqual(clean('\\\\evil.example/i.png'), '');
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
            // returns. The answers below are the ones measured against a running
            // Writer, not what the punctuation rule alone would suggest: with a
            // query after it "/" is a boundary ("Hello /pro" -> "pro"), but a
            // bare trigger answers with the punctuation itself ("Hello /" -> "/").
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
                // The commonest flow of all: type "/", pick the first entry.
                // Expecting '' here instead is what left the "/" sitting in
                // front of every link inserted that way.
                assert.strictEqual(SmartPicker.triggerStillThere(apiWith('/'), '/'), true);
                assert.strictEqual(SmartPicker.triggerStillThere(apiWith('word'), '/'), false);
                // An empty answer means the caret is not after a "/" any more.
                assert.strictEqual(SmartPicker.triggerStillThere(apiWith(''), '/'), false);
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

        describe('createPending activity', function () {

            // Picking a provider ends the caret session at once, but the host's
            // modal only takes focus a moment later. Keys landing in that gap go
            // into the document behind the trigger, and used to cancel the
            // request instead -- which left "/query" and the stray character
            // sitting in front of the link that then arrived.
            var atTime = function (body) {
                var realNow = Date.now, now = 1000000;
                Date.now = function () { return now; };
                try {
                    body(function (ms) { now += ms; });
                } finally {
                    Date.now = realNow;
                }
            };

            it('takes a key typed during the hand-off as part of the trigger', function () {
                atTime(function (advance) {
                    var pending = SmartPicker.createPending();
                    pending.begin('/f');
                    advance(200);
                    pending.activity('y');
                    assert.strictEqual(pending.isPending(), true);
                    assert.strictEqual(pending.consume(), '/fy');
                });
            });

            it('lets Backspace take it away again, but not the "/" itself', function () {
                atTime(function () {
                    var pending = SmartPicker.createPending();
                    pending.begin('/f');
                    pending.activity('y');
                    pending.activity('Backspace');
                    assert.strictEqual(pending.consume(), '/f');

                    pending.begin('/');
                    pending.activity('Backspace');
                    // Nothing of the trigger is left to shorten, so the request
                    // is dropped rather than aimed at a "/" that has gone.
                    assert.strictEqual(pending.isPending(), false);
                });
            });

            it('drops the request on a key that moves the caret', function () {
                atTime(function () {
                    var pending = SmartPicker.createPending();
                    pending.begin('/f');
                    pending.activity('ArrowLeft');
                    assert.strictEqual(pending.consume(), null);
                });
            });

            it('drops the request once the hand-off is long over', function () {
                atTime(function (advance) {
                    var pending = SmartPicker.createPending();
                    pending.begin('/f');
                    advance(SmartPicker.HANDOFF_GRACE + 1);
                    // Typing in the editor now means the picker is not in front
                    // of it, so no reply is coming and the record must not sit
                    // there waiting to delete something.
                    pending.activity('y');
                    assert.strictEqual(pending.isPending(), false);
                });
            });

            it('ignores activity when nothing is outstanding', function () {
                var pending = SmartPicker.createPending();
                pending.activity('y');
                assert.strictEqual(pending.isPending(), false);
                assert.strictEqual(pending.consume(), null);
            });
        });

        // installTrigger listens on the real document and drives the real menu,
        // so these run in the browser harness only; `node --test` covers the
        // pure functions above.
        if (typeof document !== 'undefined' && typeof KeyboardEvent === 'function') {
            describe('installTrigger', function () {

                var area, menu, opened, picked, savedMenu, installed;

                var press = function (key) {
                    area.dispatchEvent(new KeyboardEvent('keydown', {
                        key: key, bubbles: true, cancelable: true
                    }));
                };

                // A real pointerdown, which is what the editor's canvas overlay
                // emits -- and cancels, so no mousedown ever follows it.
                var pointerDown = function (target) {
                    (target || area).dispatchEvent(new MouseEvent('pointerdown', {
                        bubbles: true, cancelable: true
                    }));
                };

                // startSession runs from _.defer, which is _.delay(fn, 1) --
                // a timer, not a microtask, so waiting has to outlast it.
                var afterDefer = function (body) { setTimeout(body, 20); };

                before(function () {
                    area = document.createElement('div');
                    area.id = 'area_id';
                    document.body.appendChild(area);

                    savedMenu = Common.Views && Common.Views.SmartPickerMenu;
                    Common.Views = Common.Views || {};
                    menu = Common.Views.SmartPickerMenu = {
                        _open: false,
                        open: function (options) { this._open = true; opened++; this._onPick = options.onPick; },
                        close: function () { this._open = false; },
                        isOpen: function () { return this._open; },
                        filter: function () {},
                        moveSelection: function () {},
                        pickSelected: function () { this._onPick('files'); return true; },
                        ownsElement: function () { return false; }
                    };

                    // One installation for the whole suite: it binds to the
                    // document for good, exactly as an editor does.
                    installed = {available: true};
                    SmartPicker.installTrigger({
                        isAvailable: function () { return installed.available; },
                        onActivity: function () {},
                        getHolder: function () { return $(document.body); },
                        onPick: function (providerId, replace) { picked = {providerId: providerId, replace: replace}; }
                    });
                });

                after(function () {
                    area.parentNode.removeChild(area);
                    Common.Views.SmartPickerMenu = savedMenu;
                });

                beforeEach(function () {
                    opened = 0;
                    picked = null;
                    menu._open = false;
                });

                it('opens on "/" typed after a space', function (done) {
                    press(' ');
                    press('/');
                    afterDefer(function () {
                        assert.strictEqual(opened, 1);
                        press('Escape');
                        done();
                    });
                });

                it('opens again in a new place after a click', function (done) {
                    // The regression: "/" left lastKey as "/" for good, so
                    // slashCanTrigger rejected every later trigger and the
                    // feature worked exactly once per document. A click moves
                    // the caret somewhere this cannot see, which is the same
                    // state as "nothing typed yet".
                    press(' ');
                    press('/');
                    afterDefer(function () {
                        press('Escape');
                        pointerDown();
                        press('/');
                        afterDefer(function () {
                            assert.strictEqual(opened, 2, '"/" must trigger again after a click');
                            press('Escape');
                            done();
                        });
                    });
                });

                it('opens again after an arrow key has moved the caret', function (done) {
                    press(' ');
                    press('/');
                    afterDefer(function () {
                        press('Escape');
                        press('ArrowRight');
                        press('/');
                        afterDefer(function () {
                            assert.strictEqual(opened, 2);
                            press('Escape');
                            done();
                        });
                    });
                });

                it('still refuses a second "/" typed straight after the first', function (done) {
                    // "//" is literal in tiptap too: the character before the
                    // trigger is the old one, not whitespace.
                    press(' ');
                    press('/');
                    afterDefer(function () {
                        press('Escape');
                        press('/');
                        afterDefer(function () {
                            assert.strictEqual(opened, 1);
                            done();
                        });
                    });
                });

                it('ends the session on a pointerdown outside the menu', function (done) {
                    // mousedown never arrives: sdkjs cancels the pointerdown on
                    // its canvas overlay, so the browser synthesises no
                    // compatibility mouse events at all. A session left running
                    // here looked dismissed but reopened the host picker on the
                    // next Enter.
                    press(' ');
                    press('/');
                    afterDefer(function () {
                        pointerDown();
                        assert.strictEqual(menu.isOpen(), false, 'the menu must be disposed');
                        press('Enter');
                        assert.strictEqual(picked, null, 'Enter must not pick after the click');
                        done();
                    });
                });

                it('does not open when the host says the picker is unavailable', function (done) {
                    installed.available = false;
                    press(' ');
                    press('/');
                    afterDefer(function () {
                        installed.available = true;
                        assert.strictEqual(opened, 0);
                        done();
                    });
                });
            });
        }
    });
}));
