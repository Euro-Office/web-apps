/*
 * Native Smart Picker menu.
 *
 * Typing "/" after a space or newline opens this menu at the caret, listing the
 * insertable providers the Nextcloud instance actually offers (files, profiles,
 * Talk conversations, ...). Only this provider-selection step is editor-native;
 * it is a plain list, so nothing is duplicated by drawing it ourselves.
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
 */
define([
    'common/main/lib/component/Menu',
    'common/main/lib/component/MenuItem'
], function () { 'use strict';

    Common.Views = Common.Views || {};

    Common.Views.SmartPickerMenu = new(function() {
        var _menu,
            _providers,
            _api;

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
                // Visible caret: place the menu just under it.
                if (r && (r.left || r.top) && r.height >= 0) {
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

        var _buildMenu = function(providers, onDelegate) {
            var items = [];

            (providers || []).filter(function(p) {
                return !_isReplaced(p.id);
            }).forEach(function(p) {
                items.push(new Common.UI.MenuItem({
                    caption: p.title || p.id,
                    value: p.id,
                    // MenuItem renders iconImg itself as <img class="menu-item-icon">.
                    iconImg: p.icon_url || ''
                }));
            });

            var menu = new Common.UI.Menu({
                cls: 'shifted-right',
                menuAlign: 'tl-bl',
                items: items
            });
            menu.on('item:click', function(m, item) {
                if (item && item.value) onDelegate(item.value);
            });
            return menu;
        };

        return {
            /**
             * Show the picker menu at the caret.
             *
             * @param {Object} options {api, holderEl, onPick, getAnchor}
             */
            show: function(options) {
                var api = options.api,
                    holderEl = options.holderEl,
                    onPick = options.onPick,
                    getAnchor = options.getAnchor;
                _api = api;

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

                // Rebuild each time: the host refreshes the list when the instance
                // changes, and an admin can enable or disable apps while we are open.
                if (_menu) {
                    _menu.hide();
                    _menu = undefined;
                }
                _menu = _buildMenu(providers, function(providerId) {
                    onPick(providerId);
                });

                Common.UI.Menu.Manager.hideAll();

                // Rebuilt every time, so the container must be emptied first:
                // rendering a fresh menu into a container that still holds the
                // previous one leaves both in the DOM (that was the duplicate
                // list). position:fixed keeps it independent of whether the
                // document holder is a positioned ancestor -- it is not.
                var holder = $(holderEl),
                    containerId = 'menu-container-smartpicker',
                    container = holder.find('#' + containerId);
                if (container.length) {
                    container.remove();
                }
                container = $('<div id="' + containerId + '" style="position: fixed; z-index: 10000;">'
                    + '<div class="dropdown-toggle" data-toggle="dropdown"></div></div>');
                holder.append(container);

                _menu.render(container);
                _menu.cmpEl.attr({tabindex: '-1'});

                // An editor that knows better says so: the spreadsheet anchors to
                // the active cell, because it has no text caret unless a cell is
                // being edited inline.
                var point = (getAnchor && getAnchor()) || _caretPoint();
                if (!point) {
                    // No caret anchor: fall back to the holder's top-left.
                    var hr = holder[0] ? holder[0].getBoundingClientRect() : {left: 40, top: 60};
                    point = [Math.round(hr.left) + 20, Math.round(hr.top) + 20];
                }
                // Keep the menu on screen near the edges.
                var w = _menu.cmpEl.outerWidth() || 240,
                    h = _menu.cmpEl.outerHeight() || 220,
                    left = Math.min(point[0], Math.max(0, window.innerWidth - w - 8)),
                    top = point[1];
                if (top + h > window.innerHeight - 8) {
                    top = Math.max(8, point[1] - h - 20);   // flip above the caret
                }
                container.css({left: left, top: top});

                _menu.show();
                _.delay(function() {
                    _menu.cmpEl.focus();
                }, 10);
            },

            /**
             * Receive the provider list from the host.
             *
             * @param {Array} providers [{id, title, icon_url}]
             */
            setProviders: function(providers) {
                _providers = $.isArray(providers) ? providers : [];
            },

            hide: function() {
                _menu && _menu.hide();
            },

            txtAnyLink: 'Any link'
        };
    })();

    return Common.Views.SmartPickerMenu;
});
