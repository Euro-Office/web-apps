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
 * Writer, Presentation and Spreadsheet share all of that. Only the insertion
 * itself genuinely differs per editor, so only that stays in the controllers.
 */
define([], function () { 'use strict';

    Common.Utils = Common.Utils || {};

    // Keys that end the match by moving the caret out of it, mirroring how the
    // tiptap plugin re-resolves its range on every selection change.
    var CARET_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'Delete'];

    // Held down while typing a character; they must never be mistaken for one.
    var MODIFIER_KEYS = ['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock', 'Dead'];

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
            if (/^\/[^\/]/.test(url)) return url;                // host-relative
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

            var closeSession = function () {
                if (query === null) return;
                query = null;
                menu().close();
            };

            var startSession = function () {
                query = '';
                menu().open({
                    holderEl: options.getHolder(),
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
                if (!/area_id/.test(targetId)) return;

                if (query !== null) {
                    if (handleSession(e)) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                } else {
                    // Reaching the editor at all means the host's picker is not
                    // in front of it, so no reply can still be coming.
                    options.onActivity && options.onActivity();
                }

                var prevKey = lastKey;
                if (e.key.length === 1 || e.key === 'Enter') {
                    lastKey = e.key;
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

            // Clicking anywhere moves the caret out of the match -- except in
            // the menu itself, where the click is how an entry gets picked.
            document.addEventListener('mousedown', function (e) {
                if (query === null) return;
                if (menu().ownsElement(e.target)) return;
                closeSession();
            }, true);
        }
    };

    return Common.Utils.SmartPicker;
});
