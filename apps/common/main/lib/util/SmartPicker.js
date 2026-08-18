/*!
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH or an Nextcloud affiliate company and Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/*
 * Shared Smart Picker plumbing for the three editors.
 *
 * The "/" flow reproduces the one in Nextcloud's Text app, which drives it with
 * @tiptap/suggestion configured as {char: '/', allowedPrefixes: [' ']} (see
 * text/src/extensions/LinkPicker.js). Everything the user types stays in the
 * document; the menu is only a view of it:
 *
 *   - "/" at the start of a block or after a space opens the menu, and is
 *     written to the document like any other character.
 *   - Each further character is written AND narrows the list. Tiptap derives the
 *     query from the document with /[^\s\/]*\/, so a space or a second "/" ends
 *     the match: the menu closes and the character is written as normal.
 *   - Backspace shortens the query; backspacing over the "/" itself closes the
 *     menu.
 *   - Up/Down move the highlight, Enter and Tab accept, Escape dismisses. These
 *     four are the only keys taken away from the editor.
 *   - Accepting an entry replaces "/" plus the query with the picker's result,
 *     the way tiptap's command() does deleteRange(range) before inserting.
 *
 * Writer, Presentation and Spreadsheet share all of that, and share it through
 * install() rather than by copy. Only what genuinely differs per editor stays in
 * the controllers: how insertLink puts the reply into the document, and -- in
 * the spreadsheet, which has no text caret until a cell is being edited -- where
 * the menu is anchored.
 */
define([
    'common/main/lib/util/AssistantInsert'
], function () { 'use strict';

    Common.Utils = Common.Utils || {};

    // Keys that end the match by moving the caret out of it, mirroring how the
    // tiptap plugin re-resolves its range on every selection change.
    var CARET_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'Delete'];

    // Held down while typing a character; they must never be mistaken for one.
    var MODIFIER_KEYS = ['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock', 'Dead'];

    // Keys that change what is before the caret without typing a character, so
    // the last one typed stops describing it. Tab is here for the spreadsheet,
    // where it commits the cell and moves to the next one.
    var CARET_MOVED_KEYS = CARET_KEYS.concat(['Backspace', 'Tab']);

    // sdkjs element ids this feature reaches for, named once here rather than
    // spelled out at each use. Shared with SmartPickerMenu, which anchors to
    // two of them.
    var IDS = Common.Utils.SmartPickerIds = {
        // The scrollable document holder every editor renders into. Menus and
        // popups in these editors are appended to it.
        HOLDER: 'editor_sdk',
        // The hidden input sdkjs types into. Matched as a prefix, not exactly:
        // it also creates #area_id_main (the scrollable holder) and
        // #area_id_parent, and which of them is the keydown target varies by
        // editor and by edit state.
        INPUT_AREA: 'area_id',
        // The blinking caret itself, a 2x13px element the drawing document
        // moves with the cursor (declared in each editor's api.js).
        CARET: 'id_target_cursor',
        // The IME wrapper, which sdkjs places below the caret.
        IME_WRAPPER: 'area_id_parent'
    };

    var INPUT_AREA_RE = new RegExp(IDS.INPUT_AREA);

    Common.Utils.SmartPicker = {

        /*
         * How long a request to the host may stay outstanding.
         *
         * A backstop, not the primary defence: any keystroke in the editor area
         * clears the flag (see onActivity), and the user cannot type there while
         * the host's picker is open. This only covers a host that neither answers
         * nor cancels while the user also never touches the keyboard again.
         *
         * It therefore has to outlast a person using the picker, because nothing
         * else clears the record while that modal is in front of the editor. One
         * minute did not: searching a name, scrolling a longer result list, or
         * simply being interrupted takes longer than that, and expiring mid-flow
         * does not fail safe -- insertLink still inserts the link, but consume()
         * has already returned null, so the "/query" the user typed is left in
         * the document beside it. Measured before this was raised: 11 s from
         * picking a provider to confirming replaced the trigger correctly, 77 s
         * left it behind.
         *
         * Expiring is only protective if the document moved under us without a
         * keystroke, which the caret cannot do on its own -- so a generous value
         * costs nothing that the keystroke clear was not already covering.
         */
        PENDING_TIMEOUT: 600000,

        /*
         * How long after picking a provider a keystroke still counts as part of
         * the trigger rather than as proof that no reply is coming.
         *
         * Picking ends the caret session at once, but the host's modal only
         * takes focus a moment later, so there is a real gap in which a
         * keystroke still lands in the document, immediately behind the "/query"
         * that is about to be deleted. Treating that as "the picker never
         * opened" was wrong twice over -- the reply IS ours, and the extra
         * character is part of what has to go -- and it showed as the trigger
         * and the stray character surviving in front of the inserted link.
         *
         * Three seconds is far longer than the hand-off (a postMessage and a
         * modal mount) and far shorter than a person reading the picker, so it
         * separates the two cases without needing to know which one is running.
         */
        HANDOFF_GRACE: 3000,

        /**
         * Whether the trigger text is still sitting where it was typed.
         *
         * The deletion primitive cannot answer this. pluginMethod_InputText(text,
         * textReplace) does not match textReplace against the document at all -- it
         * fires textReplace.length backspaces at the caret and inserts. Verified
         * against a running editor: with "Hello world" and the caret at the end,
         * asking it to replace "ZZZZ" -- a string that appears nowhere -- left
         * "Hello w".
         *
         * So anything that moves the caret between picking a provider and the reply
         * arriving turns the deletion into silent damage, and co-editing makes that
         * reachable without the user doing anything: a remote change shifts this
         * user's caret, and onActivity does not fire because a remote change is not
         * a keystroke here. The trigger is also visible to everyone as literal text
         * while the picker is open, so a co-author may simply tidy it away.
         *
         * Failure is not symmetric. Leaving a stray "/query" behind is cosmetic and
         * the user can delete it; eating four characters of someone else's sentence
         * is data loss that syncs to everyone. So this only permits the deletion
         * when the text before the caret still looks like what was typed.
         *
         * What "the word before the caret" means is sdkjs's answer, not a guess,
         * and it is not the same for both shapes of trigger. Measured against a
         * running Writer with the caret at the end:
         *
         *     "Hello /pro"  -> "pro"      "/pro" -> "pro"
         *     "Hello /"     -> "/"        ""     -> ""
         *
         * So "/" is a boundary once a query follows it, but on its own the
         * punctuation run is itself the current word. Expecting "" for a bare
         * trigger -- which is what the boundary rule alone suggests -- made this
         * refuse every deletion for the commonest flow there is: type "/", pick
         * the first entry, and the "/" stayed in the document in front of the
         * link.
         *
         * Editors whose api does not expose asc_GetCurrentWord (Presentation and
         * Spreadsheet at the time of writing -- it is exported only in word/api.js)
         * cannot be checked, and keep the previous behaviour rather than losing the
         * feature. Exporting it there would extend this guard to them unchanged.
         *
         * @param {Object} api the editor api
         * @param {String} replace the trigger text, "/" plus the query
         * @return {Boolean} true when deleting it is safe, or cannot be checked
         */
        triggerStillThere: function (api, replace) {
            if (!api || typeof api.asc_GetCurrentWord !== 'function') return true;

            var query = (replace || '').replace(/^\//, ''),
                expected = query === '' ? (replace || '') : query,
                actual;
            try {
                actual = api.asc_GetCurrentWord(-1);
            } catch (e) {
                // Never let a probe stop an insertion; fall back to the old behaviour.
                return true;
            }
            return (actual || '') === expected;
        },

        /**
         * Whether "/" should open the Smart Picker at the current position.
         *
         * The Text app passes allowedPrefixes: [' '] to @tiptap/suggestion,
         * whose findSuggestionMatch then requires the character before the
         * trigger to be a space, or the trigger to sit at position 0. Tiptap
         * reads that from the *text*, which is why it is layout-independent.
         * The editor exposes no cheap way to read the character before the
         * caret, so this approximates it with the last character-producing
         * keystroke: key.length === 1 is exactly that test and excludes
         * Shift/Alt/AltGraph/arrows/F-keys without maintaining a list. Tracking
         * every key was the original bug -- on a German layout "/" is Shift+7,
         * so Shift overwrote the space that preceded it.
         *
         * "/" itself counts as a previous character, so "//" does not open the
         * menu -- again matching tiptap, whose query character class is
         * [^\s\/] and whose prefix check then rejects the second slash.
         *
         * @param {String|undefined} prevKey last character-producing key
         * @return {Boolean} true when "/" should open the picker
         */
        slashCanTrigger: function (prevKey) {
            if (prevKey === undefined) return true;              // nothing typed yet
            if (prevKey === 'Enter') return true;                // start of a new line
            return prevKey.length === 1 && /[\xA0\s]/.test(prevKey);
        },

        /**
         * Provider icons come from the host, which sources them from whichever
         * Nextcloud apps registered a picker provider. MenuItem interpolates
         * iconImg into an src attribute unescaped, so anything but a plain
         * http(s), host-relative or data:image URL is dropped rather than
         * rendered.
         *
         * @param {String} url provider icon_url
         * @return {String} the url, or '' when it is not a safe image source
         */
        sanitizeIconUrl: function (url) {
            if (typeof url !== 'string' || !url) return '';
            if (/["'<>\s]/.test(url)) return '';
            if (/^https?:\/\//i.test(url)) return url;
            if (/^data:image\//i.test(url)) return url;
            // Host-relative. The second character must be neither "/" nor "\":
            // browsers normalise backslashes to slashes when parsing a url, so
            // "/\host/path" is the protocol-relative "//host/path" and would
            // fetch from a foreign origin while reading as same-origin here.
            if (/^\/[^\/\\]/.test(url)) return url;
            return '';
        },

        /**
         * Track one outstanding request to the host.
         *
         * @return {Object} {begin, isPending, consume, clear}
         */
        createPending: function () {
            var _active = false,
                _at = 0,
                _replace = '';

            return {
                /**
                 * @param {String} replace text the reply must delete first
                 */
                begin: function (replace) {
                    _active = true;
                    _at = Date.now();
                    _replace = replace || '';
                },

                isPending: function () {
                    if (!_active) return false;
                    if (Date.now() - _at > Common.Utils.SmartPicker.PENDING_TIMEOUT) {
                        this.clear();
                        return false;
                    }
                    return true;
                },

                /**
                 * Take the request, if one is genuinely outstanding.
                 *
                 * @return {String|null} text to delete first, null when the
                 *                       reply did not come from our request
                 */
                consume: function () {
                    if (!this.isPending()) return null;
                    var replace = _replace;
                    this.clear();
                    return replace;
                },

                /**
                 * A key reached the editor while a request was outstanding.
                 *
                 * Within the hand-off grace the key was typed into the document
                 * behind the trigger, so it becomes part of what the reply has
                 * to delete. After it, the picker is not in front of the editor
                 * any more and no reply can still be coming, so the record goes.
                 *
                 * Backspace shortens the text again, but never past the "/"
                 * itself: once that is gone there is no trigger left to delete.
                 *
                 * @param {String} key the KeyboardEvent key
                 */
                activity: function (key) {
                    if (!this.isPending()) return;
                    if (Date.now() - _at <= Common.Utils.SmartPicker.HANDOFF_GRACE) {
                        if (typeof key === 'string' && key.length === 1) {
                            _replace += key;
                            return;
                        }
                        if (key === 'Backspace' && _replace.length > 1) {
                            _replace = _replace.slice(0, -1);
                            return;
                        }
                    }
                    this.clear();
                },

                clear: function () {
                    _active = false;
                    _at = 0;
                    _replace = '';
                }
            };
        },

        /**
         * Bind the "/" trigger and run the menu session it opens.
         *
         * Capture phase, on document. sdkjs binds its own handler to #area_id
         * (text_input2.js: HtmlArea.onkeydown), so a bubble-phase listener runs
         * only after the editor has already acted on the key -- too late to keep
         * Up/Down/Enter from moving the caret while the menu is open, and, in
         * the spreadsheet, too late to see a keystroke the cell editor consumed.
         * Capture runs first, so stopPropagation() can take those four keys away
         * from the editor and leave every other key untouched.
         *
         * The trigger itself is deliberately NOT cancelled. sdkjs inserts
         * printable characters from onKeyPress (CDocument.OnKeyPress ->
         * EnterText), which preventDefault on keydown suppresses -- so
         * cancelling here made "/" untypeable after a space, and left the
         * editors deleting a real character to "remove" a "/" that had never
         * been inserted.
         *
         * @param {Object} options {isAvailable, onActivity, getHolder, getAnchor, onPick}
         */
        installTrigger: function (options) {
            var lastKey,
                query = null,            // null while no menu session is running
                menu = function () { return Common.Views.SmartPickerMenu; };

            /*
             * Forget which character was typed last.
             *
             * lastKey stands in for "the character before the caret", so it is
             * only meaningful while the caret is where the typing left it.
             * Anything that moves it elsewhere -- a click, an arrow key, a
             * Backspace, Tab into the next cell -- makes it a statement about
             * some other position, and undefined ("nothing typed yet") is the
             * honest answer instead.
             *
             * Leaving it stale is what made the feature work exactly once per
             * document: "/" sets lastKey to "/", and slashCanTrigger then
             * rejects every later "/" -- in any cell, any text box, any
             * paragraph -- until a space happened to be typed first.
             *
             * Undefined is the permissive value, so "/" typed after clicking
             * into the middle of a word opens the menu where tiptap, which
             * reads the real character out of the document, would not. That is
             * the deliberate trade: this cannot see the document, and a menu
             * one Escape away beats a trigger that silently stops working.
             */
            var forgetPrevKey = function () { lastKey = undefined; };

            var closeSession = function () {
                if (query === null) return;
                query = null;
                menu().close();
            };

            var startSession = function () {
                query = '';
                menu().open({
                    // jQuery-wrapped, as every getHolder() in these editors is.
                    holder: options.getHolder(),
                    getAnchor: options.getAnchor,
                    onPick: function (providerId) {
                        // Replace the trigger and everything typed after it,
                        // the way tiptap's command() calls deleteRange(range).
                        var replace = '/' + query;
                        closeSession();
                        options.onPick(providerId, replace);
                    }
                });
            };

            /**
             * @return {Boolean} true when the editor must not see this key
             */
            var handleSession = function (e) {
                // The menu can also be dismissed from outside, e.g. by any
                // Common.UI.Menu.Manager.hideAll(). Then the session is over.
                if (!menu().isOpen()) {
                    query = null;
                    return false;
                }
                // Real shortcuts end the session and are passed through.
                if (e.ctrlKey || e.metaKey) {
                    closeSession();
                    return false;
                }
                // A modifier on its own is not a character and must not be
                // mistaken for one -- Shift is pressed to type any capital.
                if (MODIFIER_KEYS.indexOf(e.key) >= 0) return false;

                switch (e.key) {
                    case 'Escape':
                        closeSession();
                        return true;
                    case 'ArrowUp':
                        menu().moveSelection(-1);
                        return true;
                    case 'ArrowDown':
                        menu().moveSelection(1);
                        return true;
                    case 'Enter':
                    case 'Tab':
                        if (menu().pickSelected()) return true;
                        // Nothing to accept: let the key through as normal.
                        closeSession();
                        return false;
                    case 'Backspace':
                        if (query === '') {
                            // The "/" itself is going, so the match is over.
                            closeSession();
                        } else {
                            query = query.slice(0, -1);
                            menu().filter(query);
                        }
                        return false;
                    case ' ':
                    case '/':
                        // Both end tiptap's match; the character is still typed.
                        closeSession();
                        return false;
                    default:
                        if (CARET_KEYS.indexOf(e.key) >= 0) {
                            closeSession();
                            return false;
                        }
                        if (e.key.length === 1) {
                            query += e.key;
                            menu().filter(query);
                        }
                        // Anything else (F-keys, Insert, ...) is left alone and
                        // does not disturb the session.
                        return false;
                }
            };

            var handler = function (e) {
                // e.key is absent on some synthetic and IME-generated events,
                // and an exception here would break typing altogether.
                if (!e || typeof e.key !== 'string') return;

                // Permissive on purpose: sdkjs creates both #area_id (the input)
                // and #area_id_main (the scrollable holder), and which one is
                // the keydown target varies by editor and edit state. Anchoring
                // this to /^area_id$/ silently killed the trigger.
                var targetId = (e.target && e.target.id) || '';
                if (!INPUT_AREA_RE.test(targetId)) return;

                if (query !== null) {
                    if (handleSession(e)) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                } else {
                    // Outside the hand-off gap, reaching the editor at all means
                    // the host's picker is not in front of it and no reply can
                    // still be coming. Inside it, the key was typed behind the
                    // trigger and has to be deleted with it -- which is why the
                    // key itself is passed on. See createPending().activity.
                    options.onActivity && options.onActivity(e.key);
                }

                var prevKey = lastKey;
                if (e.key.length === 1 || e.key === 'Enter') {
                    lastKey = e.key;
                } else if (CARET_MOVED_KEYS.indexOf(e.key) >= 0) {
                    forgetPrevKey();
                }

                // Do not test altKey: browsers report AltGr as ctrl+alt, and on
                // several layouts AltGr is how "/" is typed at all. Block only
                // real shortcuts.
                if (e.key !== '/' || (e.ctrlKey && !e.altKey) || e.metaKey) return;
                // A "/" that just ended a session cannot start a new one: the
                // character before it is the old trigger or its query, never
                // whitespace, so slashCanTrigger already rejects it.
                if (!Common.Utils.SmartPicker.slashCanTrigger(prevKey)) return;
                if (!options.isAvailable()) return;

                // Next tick, so the "/" is in the document before the menu opens.
                _.defer(startSession);
            };

            document.addEventListener('keydown', handler, true);

            /*
             * Clicking anywhere moves the caret out of the match -- except in
             * the menu itself, where the click is how an entry gets picked.
             *
             * pointerdown, not just mousedown. sdkjs handles pointerdown on its
             * canvas overlay (#id_viewer_overlay) and cancels it, so the browser
             * never synthesises the compatibility mousedown at all: measured in a
             * running Writer, one click in the document area fires pointerdown
             * and click on the overlay and no mousedown whatsoever. A
             * mousedown-only listener therefore never ran, and the session
             * outlived the click -- the list was hidden by the editor's own
             * hideAll(), so it looked dismissed, while Enter much later still
             * opened the host's picker for whatever was left highlighted.
             *
             * Both are bound because pointer events are what the editor cancels,
             * not what every path emits; closeSession() and forgetPrevKey() are
             * idempotent, so handling the same gesture twice costs nothing.
             */
            var onPointerDown = function (e) {
                forgetPrevKey();
                if (query === null) return;
                if (menu().ownsElement(e.target)) return;
                closeSession();
            };
            document.addEventListener('pointerdown', onPointerDown, true);
            document.addEventListener('mousedown', onPointerDown, true);
        },

        /**
         * Wire one editor's Toolbar controller up to the Smart Picker.
         *
         * This was three copies, one per editor, and they had already drifted:
         * different comment wording, one carrying a guard the others did not.
         * Everything that is genuinely per-editor -- where the menu is anchored,
         * and how insertLink puts the reply into the document -- stays with the
         * editor; everything else is the same wiring three times, so it lives
         * here and a fix now lands in all three at once.
         *
         * The controller keeps `_smartPickerAvailable`, because its own render
         * path re-applies the button's visibility from it after a re-render.
         *
         * @param {Object} controller the editor's Toolbar controller
         * @param {Object} options {getAnchor, onPick} per-editor hooks, optional
         * @return {Object} the pending record insertLink consumes
         */
        install: function (controller, options) {
            options = options || {};
            var pending = this.createPending();

            Common.Gateway.on('setsmartpickeravailable', function (available) {
                controller._smartPickerAvailable = !!available;
                var btn = controller.toolbar && controller.toolbar.btnSmartPicker;
                btn && btn.setVisible(!!available);
            });
            Common.Gateway.on('setsmartpickerproviders', function (data) {
                // Pushed by the host rather than fetched by us: the list has to
                // come from whichever page opens the picker, and only that page
                // knows which providers it can actually open.
                Common.Views.SmartPickerMenu.setProviders(data && data.providers);
            });
            Common.Gateway.on('setsmartpickercancel', function () {
                // The "/" and its query were typed by the user, so they stay --
                // as they do in Nextcloud's Text app when its picker is
                // dismissed. Just restore focus.
                pending.clear();
                Common.NotificationCenter.trigger('edit:complete');
            });
            Common.Gateway.on('insertassistantresult', function (data) {
                // Sent when the user presses "Insert into document" in
                // Nextcloud's own Assistant form. The host has already turned
                // the model's markdown into HTML, so formatting survives.
                Common.Utils.AssistantInsert.insert(controller.api, data || {});
            });

            Common.Utils.SmartPicker.installTrigger({
                isAvailable: function () { return !!controller._smartPickerAvailable; },
                onActivity: function (key) { pending.activity(key); },
                getHolder: function () { return $('#' + IDS.HOLDER); },
                getAnchor: options.getAnchor,
                onPick: function (providerId, replace) {
                    // replace is "/" plus whatever was typed after it; the reply
                    // deletes exactly that before inserting the link.
                    pending.begin(replace);
                    options.onPick && options.onPick(replace);
                    Common.Gateway.requestSmartPicker('', 'toolbar', providerId);
                }
            });

            return pending;
        }
    };

    return Common.Utils.SmartPicker;
});
