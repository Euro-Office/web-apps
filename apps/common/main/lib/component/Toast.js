/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 *  Toast.js
 *
 *  Central toast component: transient, auto-hiding messages (e.g. a hint how to
 *  leave Zen mode). Usually shown through the static Common.UI.Toast.show(text, options);
 *  the class can also be instantiated directly like any other Common.UI component.
 *
 *  Options:
 *  - text     {String|String[]} message; an array renders as stacked lines in one toast
 *  - timeout  {Number}          ms until the toast hides itself; 0 = sticky (until closed);
 *                               default 4000. The timer pauses while the mouse hovers the toast.
 *  - position {String}          one of 'top-left', 'top-center', 'top-right', 'bottom-left',
 *                               'bottom-center', 'bottom-right'; default 'top-center'.
 *                               An unknown value throws an Error instead of falling back.
 *  - closable {Boolean}         show a close button; default true
 *  - cls      {String}          extra css class(es) added to the toast element
 *  - announce {Boolean}         announce the message to screen readers via
 *                               Common.Utils.ScreenReaderHelper.speech(); default true.
 *                               The toast itself carries no aria-live region, and the
 *                               close button is only announced when it receives focus.
 *
 *  Colors come from the theme css variables (see toast.less), so a toast follows the
 *  currently selected theme automatically.
 */

if (Common === undefined)
    var Common = {};

define([
    'common/main/lib/component/BaseView',
    'common/main/lib/util/ScreenReaderHelper'
], function () {
    'use strict';

    var POSITIONS = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
    var DEFAULT_POSITION = 'top-center';
    var DEFAULT_TIMEOUT = 4000;
    var HIDE_ANIMATION_MS = 300; // keep in sync with the fade-out transition in toast.less

    var containers = {}; // position -> container element
    var current = {};    // position -> currently visible Toast instance

    Common.UI.Toast = Common.UI.BaseView.extend({
        options: {
            text: '',
            timeout: DEFAULT_TIMEOUT,
            position: DEFAULT_POSITION,
            closable: true,
            cls: '',
            announce: true
        },

        className: 'toast',

        template: _.template([
            '<div class="toast-text">',
                '<% _.each(lines, function(line) { %><div class="toast-line"><%- line %></div><% }); %>',
            '</div>',
            '<% if (closable) { %>',
                '<button type="button" class="toast-close" aria-label="<%- closeLabel %>">&times;</button>',
            '<% } %>'
        ].join('')),

        initialize: function (options) {
            Common.UI.BaseView.prototype.initialize.call(this, options);

            var me = this;
            me.options = me.options || {};
            me.timeout = me.options.timeout === undefined ? DEFAULT_TIMEOUT : me.options.timeout;
            me.position = me.options.position === undefined ? DEFAULT_POSITION : me.options.position;
            if (POSITIONS.indexOf(me.position) < 0) {
                throw new Error('Common.UI.Toast: unknown position "' + me.position +
                    '" (expected one of: ' + POSITIONS.join(', ') + ')');
            }
            me.closable = me.options.closable !== false;
            me.announce = me.options.announce !== false;

            me._timer = null;
            me._remaining = 0;
            me._startedAt = 0;
            me._hiding = false;
        },

        render: function () {
            var me = this;

            var lines = _.isArray(me.options.text) ? me.options.text : [me.options.text || ''];
            me.$el.html(me.template({
                lines: lines,
                closable: me.closable,
                closeLabel: Common.Locale.get('textClose', {name: 'Common.Translation', default: 'Close'})
            }));
            me.options.cls && me.$el.addClass(me.options.cls);

            me.$el.find('.toast-close').on('click', function (e) {
                e.stopPropagation();
                me.hide();
            });
            me.$el.on('mouseenter', _.bind(me._pauseTimer, me));
            me.$el.on('mouseleave', _.bind(me._resumeTimer, me));

            return me;
        },

        show: function () {
            var me = this;
            me._hiding = false;
            me.$el.removeClass('toast-hide');
            me._startTimer();
            if (me.announce && Common.Utils.ScreenReaderHelper) {
                var text = _.isArray(me.options.text) ? me.options.text.join('\n') : (me.options.text || '');
                Common.Utils.ScreenReaderHelper.speech(text);
            }
            Common.NotificationCenter.trigger('toast:show', me);
            return me;
        },

        hide: function () {
            var me = this;
            if (me._hiding) return me;
            me._hiding = true;
            me._clearTimer();

            me.$el.addClass('toast-hide');
            setTimeout(function () {
                if (current[me.position] === me) {
                    delete current[me.position];
                }
                Common.NotificationCenter.trigger('toast:hide', me);
                me.remove();
            }, HIDE_ANIMATION_MS);
            return me;
        },

        _startTimer: function () {
            var me = this;
            me._clearTimer();
            if (me.timeout > 0) {
                me._remaining = me.timeout;
                me._startedAt = Date.now();
                me._timer = setTimeout(function () { me.hide(); }, me._remaining);
            }
        },

        _pauseTimer: function () {
            var me = this;
            if (me._timer) {
                clearTimeout(me._timer);
                me._timer = null;
                me._remaining -= Date.now() - me._startedAt;
            }
        },

        _resumeTimer: function () {
            var me = this;
            if (me.timeout > 0 && !me._timer && me._remaining > 0 && !me._hiding) {
                me._startedAt = Date.now();
                me._timer = setTimeout(function () { me.hide(); }, me._remaining);
            }
        },

        _clearTimer: function () {
            if (this._timer) {
                clearTimeout(this._timer);
                this._timer = null;
            }
        }
    });

    // The container is a plain element (no aria-live): screen reader announcements
    // go through Common.Utils.ScreenReaderHelper.speech() in show() when announce is on.
    function getContainer(position) {
        if (!containers[position]) {
            var $c = $('<div class="toast-container ' + position + '"></div>');
            $('body').append($c);
            containers[position] = $c;
        }
        return containers[position];
    }

    /**
     * Show a toast, replacing the toast currently visible in the same position.
     * @param {String|String[]} text message; an array renders as stacked lines
     * @param {Object} [opts] see the options listed above
     * @returns {Common.UI.Toast} the created toast instance
     */
    Common.UI.Toast.show = function (text, opts) {
        opts = opts || {};
        var position = opts.position === undefined ? DEFAULT_POSITION : opts.position;
        if (POSITIONS.indexOf(position) < 0) {
            throw new Error('Common.UI.Toast: unknown position "' + position +
                '" (expected one of: ' + POSITIONS.join(', ') + ')');
        }

        if (current[position]) {
            current[position].hide();
        }

        var toast = new Common.UI.Toast(_.extend({}, opts, {text: text, position: position}));
        toast.render();
        getContainer(position).append(toast.$el);
        current[position] = toast;
        toast.show();
        return toast;
    };

    /**
     * Hide the toast in the given position, or all toasts when no position is given.
     * @param {String} [position]
     */
    Common.UI.Toast.hide = function (position) {
        if (position) {
            current[position] && current[position].hide();
        } else {
            _.each(_.values(current), function (toast) { toast.hide(); });
        }
    };

    return Common.UI.Toast;
});
