/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
define([], function () {
    'use strict';

    DE.Views.SelectionPane = Common.UI.BaseView.extend(_.extend({
        el: '#left-panel-selectionpane',

        template: _.template([
            '<div id="selectionpane-box" class="layout-ct active">',
                '<div class="selectionpane-content">',
                    '<div id="selectionpane-page"></div>',
                    '<div id="selectionpane-list"></div>',
                    '<div id="selectionpane-order" role="group" aria-describedby="selectionpane-order-hint">',
                        '<div id="selectionpane-front"></div>',
                        '<div id="selectionpane-forward"></div>',
                        '<div id="selectionpane-backward"></div>',
                        '<div id="selectionpane-back"></div>',
                    '</div>',
                    '<div id="selectionpane-order-hint" class="hidden"></div>',
                '</div>',
                '<div id="selectionpane-header">',
                    '<label role="heading"><%= scope.txtTitle %></label>',
                    '<div id="selectionpane-btn-close" class="float-right margin-left-4"></div>',
                '</div>',
            '</div>'
        ].join('')),

        initialize: function(options) {
            _.extend(this, options);
            Common.UI.BaseView.prototype.initialize.call(this, arguments);
        },

        render: function(el) {
            el = el || this.el;
            this.setElement(el);
            this.$el.html(this.template({scope: this}));

            this.buttonClose = new Common.UI.Button({
                parentEl: $('#selectionpane-btn-close', this.$el),
                cls: 'btn-toolbar',
                iconCls: 'toolbar__icon btn-close',
                hint: this.txtClosePanel,
                dataHint: '1',
                dataHintDirection: 'bottom',
                dataHintOffset: 'big'
            });
            this.buttonClose.on('click', _.bind(this.onClickClosePanel, this));

            this.objectsList = new Common.UI.ListView({
                el: $('#selectionpane-list', this.$el),
                emptyText: this.txtNoObjects,
                store: new Common.UI.DataViewStore(),
                itemTemplate: _.template([
                    '<div id="<%= id %>" class="list-item selectionpane-item">',
                        '<div class="selectionpane-name"><%= Common.Utils.String.htmlEncode(name) %></div>',
                        '<div class="selectionpane-info"><%= Common.Utils.String.htmlEncode(info) %></div>',
                    '</div>'
                ].join('')),
                dataHint: '1',
                dataHintDirection: 'left',
                dataHintOffset: 'big'
            });
            // while the arrow keys move the selection, the row under the mouse should not look highlighted too
            // (the browser also sends a mousemove when the rows are redrawn, so only count a real move)
            var listEl = this.objectsList.$el,
                mouseX, mouseY;
            // capture phase: the list stops the arrow keys from bubbling
            listEl[0].addEventListener('keydown', function() { listEl.addClass('keyboard-nav'); }, true);
            listEl.on('mousemove', function(e) {
                if (e.clientX !== mouseX || e.clientY !== mouseY) {
                    mouseX = e.clientX;
                    mouseY = e.clientY;
                    listEl.removeClass('keyboard-nav');
                }
            });

            var me = this;
            function createOrderButton(id, iconCls, hint, level) {
                var button = new Common.UI.Button({
                    parentEl: $(id, me.$el),
                    cls: 'btn-toolbar',
                    iconCls: 'toolbar__icon ' + iconCls,
                    hint: hint,
                    disabled: true,
                    // keep mouse events on the disabled button and create the tooltip now, so it still shows
                    allowMouseEventsOnDisabled: true,
                    delayRenderHint: false,
                    dataHint: '1',
                    dataHintDirection: 'top'
                });
                button.options.level = level;
                return button;
            }
            this.orderButtons = [
                createOrderButton('#selectionpane-front', 'btn-arrange-front', this.tipBringToFront, Asc.c_oAscChangeLevel.BringToFront),
                createOrderButton('#selectionpane-forward', 'btn-arrange-forward', this.tipBringForward, Asc.c_oAscChangeLevel.BringForward),
                createOrderButton('#selectionpane-backward', 'btn-arrange-backward', this.tipSendBackward, Asc.c_oAscChangeLevel.BringBackward),
                createOrderButton('#selectionpane-back', 'btn-arrange-back', this.tipSendToBack, Asc.c_oAscChangeLevel.SendToBack)
            ];

            this.lblPage = this.$el.find('#selectionpane-page');
            this.lblOrderHint = this.$el.find('#selectionpane-order-hint');
            this.setOrderDisabled(true);
            this.trigger('render:after', this);

            this.rendered = true;
            return this;
        },

        show: function () {
            Common.UI.BaseView.prototype.show.call(this,arguments);
            this.fireEvent('show', this );
        },

        hide: function () {
            Common.UI.BaseView.prototype.hide.call(this,arguments);
            this.fireEvent('hide', this );
        },

        onClickClosePanel: function() {
            Common.NotificationCenter.trigger('leftmenu:change', 'hide');
        },

        /**
         * Enables or disables the arrange buttons and shows why they are disabled.
         * @param {boolean} disabled
         * @param {string} [reason] - text shown below the buttons while they are disabled
         */
        setOrderDisabled: function(disabled, reason) {
            this.orderButtons.forEach(function(button) {
                button.setDisabled(disabled);
                button.cmpEl.attr('aria-disabled', disabled);
                // Button turns the tooltip off while disabled, but it names the action, so keep it
                var tip = button.btnEl && button.btnEl.data('bs.tooltip');
                tip && (tip.enabled = true);
            });
            reason = disabled && reason || '';
            this.lblOrderHint.text(reason).toggleClass('hidden', !reason);
        },

        listHasFocus: function() {
            return this.rendered && $.contains(this.objectsList.el, document.activeElement);
        },

        /**
         * Moves the keyboard focus to the selected row, or to the list when no row is selected.
         */
        focusList: function() {
            var list = this.objectsList,
                record = list.getSelectedRec(),
                item = record && _.find(list.dataViewItems, function(view) { return view.model === record; });
            item ? item.$el.focus() : list.focus();
        },

        txtTitle: 'Selection pane',
        txtClosePanel: 'Close selection pane',
        txtPage: 'Page {0}, from the front to the back',
        txtNoObjects: 'There are no pictures, shapes or text boxes on this page',
        txtPicture: 'Picture',
        txtShape: 'Shape',
        txtTextBox: 'Text box',
        txtChart: 'Chart',
        txtGroup: 'Group',
        txtSmartArt: 'SmartArt',
        txtObject: 'Object',
        txtInFront: 'In front of text',
        txtInline: 'In line with text',
        txtBehind: 'Behind text',
        txtHeaderFooter: 'Header or footer',
        txtSelectToArrange: 'Select an object to change its order.',
        txtInlineNoOrder: 'Objects in line with text move with the text. Choose another wrapping style to change the order.',
        tipBringToFront: 'Bring to front',
        tipBringForward: 'Bring forward',
        tipSendBackward: 'Send backward',
        tipSendToBack: 'Send to back'

    }, DE.Views.SelectionPane || {}));
});
