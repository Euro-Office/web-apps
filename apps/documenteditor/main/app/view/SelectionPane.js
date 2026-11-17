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
                    '<div id="selectionpane-order">',
                        '<div id="selectionpane-front"></div>',
                        '<div id="selectionpane-forward"></div>',
                        '<div id="selectionpane-backward"></div>',
                        '<div id="selectionpane-back"></div>',
                    '</div>',
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

            var me = this;
            function createOrderButton(id, iconCls, hint, level) {
                var button = new Common.UI.Button({
                    parentEl: $(id, me.$el),
                    cls: 'btn-toolbar',
                    iconCls: 'toolbar__icon ' + iconCls,
                    hint: hint,
                    disabled: true,
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
        tipBringToFront: 'Bring to front',
        tipBringForward: 'Bring forward',
        tipSendBackward: 'Send backward',
        tipSendToBack: 'Send to back'

    }, DE.Views.SelectionPane || {}));
});
