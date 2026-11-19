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
 *  Scroller.js
 *
 *  Created on 3/14/14
 *
 */

if (Common === undefined)
    var Common = {};

// Native overflow scrolling behind the old perfect-scrollbar API, so call sites stay untouched.
// Scrollbar look comes from scroller.less (.eo-scroller); options without a native equivalent are ignored.
define([
    'common/main/lib/component/BaseView'
], function () { 'use strict';

    Common.UI.Scroller = (function(){
        var mouseCapture;

        var releaseCapture = function() {
            document.removeEventListener('mouseup', releaseCapture, true);
            _.delay(function() { mouseCapture = false; }, 10);
        };

        // Wide enough for thin classic scrollbars and macOS overlay ones, which take no layout space
        var SCROLLBAR_HIT = 16;

        // Content clicks hit a child, so a press on the element itself near an edge it scrolls along is on its scrollbar
        var onScrollbar = function(e) {
            var el = e.currentTarget, r = el.getBoundingClientRect(),
                rtl = getComputedStyle(el).direction === 'rtl';
            return e.target === el && (
                (el.scrollHeight > el.clientHeight && (rtl ? e.clientX < r.left + SCROLLBAR_HIT : e.clientX >= r.right - SCROLLBAR_HIT)) ||
                (el.scrollWidth > el.clientWidth && e.clientY >= r.bottom - SCROLLBAR_HIT));
        };

        var onMouseDown = function(e) {
            if (onScrollbar(e)) {
                mouseCapture = true;
                document.addEventListener('mouseup', releaseCapture, true);
            }
        };

        var canScroll = function(delta, pos, size, max) {
            return delta > 0 ? pos + size < max - 1 : delta < 0 && pos > 0;
        };

        // sdkjs cancels plain wheel events on #viewport (apiBase _correctEmbeddedWork), which also
        // cancels native scrolling, so keep them from bubbling there while this element can scroll
        var onWheel = function(e) {
            var el = e.currentTarget;
            if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
            if ((el.style.overflowY !== 'hidden' && canScroll(e.deltaY, el.scrollTop, el.clientHeight, el.scrollHeight)) ||
                (el.style.overflowX !== 'hidden' && canScroll(e.deltaX, Math.abs(el.scrollLeft), el.clientWidth, el.scrollWidth))) {
                e.stopPropagation();
            }
        };

        return _.extend(Common.UI.BaseView.extend({
            options: {
                suppressScrollX         : false,
                suppressScrollY         : false
            },

            initialize: function(options) {
                Common.UI.BaseView.prototype.initialize.call(this, options);

                if (this.options.el) {
                    this.render();
                }
            },

            render: function() {
                var me = this;

                me.cmpEl = me.$el || $(this.el);

                if (!me.rendered) {
                    me.rendered = true;
                    me._onScroll = function(e) { me.options.onChange && me.options.onChange(e); };
                    me.cmpEl.addClass('eo-scroller').on('scroll', me._onScroll).on('mousedown', onMouseDown);
                    me.cmpEl[0] && me.cmpEl[0].addEventListener('wheel', onWheel, {passive: true});
                    me.update();
                }

                return this;
            },

            remove: function() {
                this.destroy();
                Backbone.View.prototype.remove.call(this);
            },

            update: function(config) {
                config && _.extend(this.options, config);
                this.cmpEl.css({
                    'overflow-x': this.options.suppressScrollX ? 'hidden' : 'auto',
                    'overflow-y': this.options.suppressScrollY ? 'hidden' : 'auto'
                });
                this.options.onChange && this.options.onChange();
            },

            destroy: function() {
                this.cmpEl.removeClass('eo-scroller').css({'overflow-x': '', 'overflow-y': ''})
                    .off('scroll', this._onScroll).off('mousedown', onMouseDown);
                this.cmpEl[0] && this.cmpEl[0].removeEventListener('wheel', onWheel, {passive: true});
                this.rendered = false;
            },

            scrollLeft: function(pos) {
                this.cmpEl.scrollLeft(pos);
            },

            scrollTop: function(pos) {
                this.cmpEl.scrollTop(pos);
            },

            getScrollTop: function () {
                return this.cmpEl.scrollTop();
            },

            getScrollLeft: function () {
                return this.cmpEl.scrollLeft();
            },

            setAlwaysVisibleX: function() {},
            setAlwaysVisibleY: function() {},
            setOptionStyleY: function() {},

            isVisible: function() {
                var el = this.cmpEl[0];
                return !this.options.suppressScrollY && !!el && el.scrollHeight > el.clientHeight;
            }

        }), {
            isMouseCapture: function() {
                return !!mouseCapture;
            },

            // Width a thin native scrollbar takes from the layout, 0 for overlay scrollbars
            // Not cached: it changes with browser zoom and OS scrollbar settings
            scrollbarWidth: function() {
                var probe = $('<div class="eo-scroller" style="position:absolute;top:-100px;width:50px;height:50px;overflow:scroll;"></div>').appendTo(document.body),
                    width = probe[0].offsetWidth - probe[0].clientWidth;
                probe.remove();
                return width;
            }
        })
    })();
});
