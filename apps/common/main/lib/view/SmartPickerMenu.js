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

/*
 * Native Smart Picker menu.
 *
 * The list of insertable providers Nextcloud offers, drawn at the caret while
 * the user types a "/" query. Common.Utils.SmartPicker owns the interaction;
 * this is only the view it drives.
 *
 * The list is pushed in by the host (setSmartPickerProviders) rather than fetched
 * here. It has to come from whichever page opens the picker, because a provider is
 * only openable where its picker component is registered -- and that is a fact
 * about that page, invisible to the OCS endpoint we used to ask. Sourcing it any
 * other way lets this menu offer entries the picker then refuses.
 *
 * Choosing an entry hands off to Nextcloud's own picker for that provider via
 * getLinkWithPicker(), and inserts the link it returns. We deliberately do not
 * reimplement those pickers. Each one carries behaviour that is not visible from
 * the outside -- minimum search lengths, provider-specific result shapes,
 * pagination, icon resolution -- and reimplementing it means rediscovering all of
 * it by hitting the failures one at a time.
 *
 * Focus stays in the document the whole time. The user is still typing into it,
 * so the highlight is drawn with the same class bootstrap's own :focus rule uses
 * (dropdown-menu.less: `li > a { &:focus, &.focus }`) rather than by moving
 * focus to the list.
 */
define([
    'common/main/lib/component/Menu',
    'common/main/lib/component/MenuItem',
    'common/main/lib/util/SmartPicker'
], function () { 'use strict';

    Common.Views = Common.Views || {};

    Common.Views.SmartPickerMenu = _.extend(new(function() {
        var CONTAINER_ID = 'menu-container-smartpicker';

        var _menu,                  // Common.UI.Menu, or undefined when closed
            _providers,             // pushed in by the host
            _entries = [],          // [{id, title, $li}] currently rendered
            _visible = [],          // subset of _entries matching the query
            _emptyRow,              // the "no suggestion found" <li>
            _selected = -1,         // index into _visible
            _onPick,
            _point;                 // anchor captured when the menu opened

        /**
         * Caret position in *viewport* coordinates.
         *
         * Anchors on #id_target_cursor, which is the blinking caret itself (a
         * 2x13px element the drawing document moves with the cursor, declared in
         * each editor's api.js). Its rect is therefore the caret, exactly.
         *
         * #area_id_parent was the wrong element: sdkjs places that IME wrapper at
         * caretBottom + FixedPosCheckElementY + TargetOffsetY + HtmlAreaOffset
         * (text_input2.js move()), an offset chain we would have to reproduce --
         * which is why the menu kept landing a constant distance too low.
         *
         * @return {Array|null} [left, top] in viewport coordinates
         */
        var _caretPoint = function() {
            var el = document.getElementById('id_target_cursor');
            if (el) {
                var r = el.getBoundingClientRect();
                // Visible caret: place the menu just under it. Height is not
                // tested -- sdkjs leaves the caret zero-height between blinks,
                // and rejecting that would drop us onto the IME wrapper below,
                // a constant distance too low.
                if (r && (r.left || r.top)) {
                    return [Math.round(r.left), Math.round(r.bottom + 2)];
                }
            }
            // Fallback: the IME wrapper. Already offset past the caret bottom by
            // sdkjs, so take its top as-is.
            var alt = document.getElementById('area_id_parent');
            if (alt && alt.getBoundingClientRect) {
                var ar = alt.getBoundingClientRect();
                if (ar && (ar.left || ar.top)) {
                    return [Math.round(ar.left), Math.round(ar.top)];
                }
            }
            return null;
        };

        /**
         * Nextcloud providers we deliberately do not list.
         *
         * Only the assistant_* ones, which duplicate the Assistant button and its
         * native dialog. Everything else -- files, profiles, Talk, Deck, and the
         * synthetic "any link" entry -- is listed and delegates to its own
         * Nextcloud picker.
         *
         * @param {String} id provider id
         * @return {Boolean} true when the entry must be hidden
         */
        var _isReplaced = function(id) {
            return id.indexOf('assistant_') === 0;
        };

        var _providerList = function() {
            var providers = (_providers || []).filter(function(p) {
                return p && p.id && !_isReplaced(p.id);
            });
            if (!providers.length) {
                // Nothing pushed yet. Still show a native menu -- "/" must never
                // turn into a Nextcloud modal, which is the whole point of having
                // this menu. "any-link" is always openable: @nextcloud/vue resolves
                // that id to its own built-in any-link picker, so the menu degrades
                // to a single entry instead of a dead end or a foreign dialog.
                providers = [{
                    id: 'any-link',
                    title: Common.Views.SmartPickerMenu.txtAnyLink,
                    icon_url: ''
                }];
            }
            return providers;
        };

        var _buildMenu = function(providers) {
            var items = providers.map(function(p) {
                return new Common.UI.MenuItem({
                    caption: p.title || p.id,
                    value: p.id,
                    // MenuItem interpolates iconImg into an src attribute
                    // without escaping it, and these urls come from whichever
                    // Nextcloud apps registered a provider -- so anything that
                    // is not a plain image source is dropped.
                    iconImg: Common.Utils.SmartPicker.sanitizeIconUrl(p.icon_url)
                });
            });

            // The empty state, shown in place of the list rather than closing
            // the menu -- the same thing Text does with "No suggestion found".
            items.push(new Common.UI.MenuItem({
                caption: Common.Views.SmartPickerMenu.txtNoResults,
                disabled: true,
                value: null
            }));

            var menu = new Common.UI.Menu({
                cls: 'shifted-right',
                menuAlign: 'tl-bl',
                items: items
            });
            menu.on('item:click', function(m, item) {
                if (item && item.value) {
                    var pick = _onPick;
                    if (pick) pick(item.value);
                }
            });
            return menu;
        };

        /*
         * Discard the current menu.
         *
         * remove(), not hide(): Menu registers itself with Common.UI.Menu.Manager
         * on construction and only unregisters from remove(), so dropping a
         * hidden one would leave it on the manager's list -- which every
         * subsequent hideAll() then walks, for the life of the session.
         */
        var _dispose = function() {
            if (_menu) {
                _menu.hide();
                _menu.remove();
                _menu = undefined;
            }
            $('#' + CONTAINER_ID).remove();
            _entries = [];
            _visible = [];
            _emptyRow = undefined;
            _selected = -1;
            _onPick = undefined;
            _point = undefined;
        };

        /* Move the highlight, without moving focus away from the document. */
        var _highlight = function(index) {
            _entries.forEach(function(entry) {
                entry.$li.find('> a').removeClass('focus');
            });
            _selected = (index >= 0 && index < _visible.length) ? index : -1;
            if (_selected >= 0) {
                var $a = _visible[_selected].$li.find('> a');
                $a.addClass('focus');
                // Only scroll when the list itself overflows. Unqualified,
                // scrollIntoView walks up to the first scrollable ancestor --
                // the document -- and moves the page under the user.
                var li = $a.closest('li')[0],
                    root = _menu.menuRoot && _menu.menuRoot[0];
                if (li && li.scrollIntoView && root && root.scrollHeight > root.clientHeight) {
                    li.scrollIntoView({block: 'nearest'});
                }
            }
        };

        /*
         * Place the menu at the anchor, re-clamped to the viewport -- the height
         * changes as the list narrows.
         *
         * Two elements move, and the order matters. The container carries the
         * anchor coordinates, but Menu.render() leaves menuRoot at
         * position:fixed, so menuRoot's own left/top are viewport coordinates
         * that alignPosition() derives from the container's offset. Moving the
         * container alone therefore does nothing until alignPosition() runs
         * again -- and Menu.show() runs it, which is why this has to happen
         * before show() and again after any resize.
         */
        var _position = function() {
            if (!_menu || !_point) return;
            var container = $('#' + CONTAINER_ID);
            if (!container.length) return;

            var w = _menu.cmpEl.outerWidth() || 240,
                h = _menu.cmpEl.outerHeight() || 220,
                left = Math.min(_point[0], Math.max(0, window.innerWidth - w - 8)),
                top = _point[1];
            if (top + h > window.innerHeight - 8) {
                top = Math.max(8, _point[1] - h - 20);   // flip above the caret
            }
            container.css({left: left, top: top});
            _menu.rendered && _menu.alignPosition && _menu.alignPosition();
        };

        /**
         * @param {Object} options {holderEl, getAnchor, onPick}
         */
        var _open = function(options) {
            _dispose();
            _onPick = options.onPick;

            var providers = _providerList();
            _menu = _buildMenu(providers);

            Common.UI.Menu.Manager.hideAll();

            // position:fixed keeps the container independent of whether the
            // document holder is a positioned ancestor -- it is not.
            var holder = $(options.holderEl),
                container = $('<div id="' + CONTAINER_ID + '" style="position: fixed; z-index: 10000;">'
                    + '<div class="dropdown-toggle" data-toggle="dropdown"></div></div>');
            holder.append(container);

            _menu.render(container);
            _menu.cmpEl.attr({tabindex: '-1'});

            // The list order is the providers', then the empty-state row last.
            var $items = _menu.menuRoot.find('> li');
            _entries = providers.map(function(p, i) {
                return {id: p.id, title: String(p.title || p.id), $li: $items.eq(i)};
            });
            _emptyRow = $items.eq(providers.length);

            // An editor that knows better says so: the spreadsheet anchors to
            // the active cell, because it has no text caret unless a cell is
            // being edited inline.
            _point = (options.getAnchor && options.getAnchor()) || _caretPoint();
            if (!_point) {
                // No caret anchor: fall back to the holder's top-left.
                var hr = holder[0] ? holder[0].getBoundingClientRect() : {left: 40, top: 60};
                _point = [Math.round(hr.left) + 20, Math.round(hr.top) + 20];
            }

            // Anchor the container before show(): show() aligns menuRoot against
            // wherever the container currently sits.
            _position();
            _menu.show();
            // Deliberately no focus() here: the user is still typing into the
            // document, and taking focus would send those keys to the list.
            _applyFilter('');
        };

        var _applyFilter = function(query) {
            var needle = String(query || '').toLowerCase();

            _visible = _entries.filter(function(entry) {
                // Substring match on the label, as Text's pickerItems() does.
                var match = !needle || entry.title.toLowerCase().indexOf(needle) >= 0;
                entry.$li.toggle(match);
                return match;
            });
            _emptyRow && _emptyRow.toggle(_visible.length === 0);

            _highlight(_visible.length ? 0 : -1);
            _position();
        };

        return {
            /**
             * Open the menu at the caret and show the full provider list.
             *
             * Never fails silently: this runs from a keystroke, so a thrown
             * error would look to the user like "/" simply does nothing.
             *
             * @param {Object} options {holderEl, getAnchor, onPick}
             */
            open: function(options) {
                try {
                    _open(options);
                } catch (err) {
                    _dispose();
                    Common.UI.warning({
                        msg: Common.Views.SmartPickerMenu.txtOpenFailed
                            + ' ' + ((err && err.message) || '')
                    });
                }
            },

            /**
             * Narrow the list to the entries matching what has been typed after
             * the "/". An empty result keeps the menu open on its empty state.
             *
             * @param {String} query text typed after the trigger
             */
            filter: function(query) {
                if (!_menu) return;
                _applyFilter(query);
            },

            /**
             * @param {Number} delta -1 for up, 1 for down; wraps around
             */
            moveSelection: function(delta) {
                if (!_menu || !_visible.length) return;
                var next = _selected < 0
                    ? (delta > 0 ? 0 : _visible.length - 1)
                    : (_selected + delta + _visible.length) % _visible.length;
                _highlight(next);
            },

            /**
             * Accept the highlighted entry.
             *
             * @return {Boolean} true when something was actually picked
             */
            pickSelected: function() {
                if (!_menu || _selected < 0 || !_visible[_selected]) return false;
                var id = _visible[_selected].id,
                    pick = _onPick;
                if (!pick) return false;
                pick(id);
                return true;
            },

            isOpen: function() {
                return !!_menu;
            },

            /**
             * @param {Element} el event target
             * @return {Boolean} true when el is inside this menu
             */
            ownsElement: function(el) {
                return !!(_menu && el && $(el).closest('#' + CONTAINER_ID).length);
            },

            /**
             * Receive the provider list from the host.
             *
             * @param {Array} providers [{id, title, icon_url}]
             */
            setProviders: function(providers) {
                _providers = $.isArray(providers) ? providers : [];
            },

            close: function() {
                _dispose();
            },

            txtAnyLink: 'Any link',
            txtNoResults: 'No suggestion found',
            txtOpenFailed: 'Smart Picker failed to open.'
        };
    })(), Common.Views.SmartPickerMenu || {});

    return Common.Views.SmartPickerMenu;
});
