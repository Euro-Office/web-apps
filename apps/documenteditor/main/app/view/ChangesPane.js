/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
define([], function () {
    'use strict';

    // List of all tracked changes in the left panel, like the comment list: who changed what, filter by author
    DE.Views.ChangesPane = Common.UI.BaseView.extend(_.extend({
        el: '#left-panel-changespane',

        template: _.template([
            '<div id="changespane-box" class="layout-ct active">',
                '<div class="changespane-content">',
                    '<div class="changespane-filter">',
                        '<label><%= scope.txtAuthor %></label>',
                        '<div id="changespane-author"></div>',
                    '</div>',
                    '<div id="changespane-count"></div>',
                    '<div id="changespane-list"></div>',
                    '<div class="changespane-bulk">',
                        '<div id="changespane-accept-all"></div>',
                        '<div id="changespane-reject-all"></div>',
                    '</div>',
                '</div>',
                '<div id="changespane-header">',
                    '<label role="heading"><%= scope.txtTitle %></label>',
                    '<div id="changespane-btn-close" class="float-right margin-left-4"></div>',
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
                parentEl: $('#changespane-btn-close', this.$el),
                cls: 'btn-toolbar',
                iconCls: 'toolbar__icon btn-close',
                hint: this.txtClosePanel,
                dataHint: '1',
                dataHintDirection: 'bottom',
                dataHintOffset: 'big'
            });
            this.buttonClose.on('click', _.bind(this.onClickClosePanel, this));

            this.cmbAuthor = new Common.UI.ComboBox({
                el: $('#changespane-author', this.$el),
                cls: 'input-group-nr',
                menuStyle: 'min-width: 100%;',
                editable: false,
                data: [{value: '', displayValue: this.txtAllAuthors}],
                dataHint: '1',
                dataHintDirection: 'bottom',
                dataHintOffset: 'big'
            });
            this.cmbAuthor.setValue('');

            this.changesList = new Common.UI.ListView({
                el: $('#changespane-list', this.$el),
                emptyText: this.txtNoChanges,
                store: new Common.UI.DataViewStore(),
                itemTemplate: _.template([
                    '<div id="<%= id %>" class="list-item changespane-item">',
                        '<div class="changespane-head">',
                            '<span class="changespane-color" style="background-color: <%= usercolor %>;"></span>',
                            '<span class="changespane-user"><%= Common.Utils.String.htmlEncode(username) %></span>',
                            '<span class="changespane-date"><%= Common.Utils.String.htmlEncode(date) %></span>',
                        '</div>',
                        '<div class="changespane-text"><%= changetext %></div>',
                        '<% if (editable) { %>',
                        '<div class="changespane-actions">',
                            '<button type="button" class="changespane-action" data-action="accept" aria-label="<%= Common.Utils.String.htmlEncode(Common.Utils.String.format(scope.txtAcceptChange, username || \'?\')) %>"><%= scope.txtAccept %></button>',
                            '<button type="button" class="changespane-action" data-action="reject" aria-label="<%= Common.Utils.String.htmlEncode(Common.Utils.String.format(scope.txtRejectChange, username || \'?\')) %>"><%= scope.txtReject %></button>',
                        '</div>',
                        '<% } %>',
                    '</div>'
                ].join('')),
                dataHint: '1',
                dataHintDirection: 'left',
                dataHintOffset: 'big'
            });

            this.btnAcceptAll = new Common.UI.Button({
                parentEl: $('#changespane-accept-all', this.$el),
                cls: 'btn-text-default',
                caption: this.txtAcceptAll,
                disabled: true
            });
            this.btnRejectAll = new Common.UI.Button({
                parentEl: $('#changespane-reject-all', this.$el),
                cls: 'btn-text-default',
                caption: this.txtRejectAll,
                disabled: true
            });

            this.lblCount = this.$el.find('#changespane-count');
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

        txtTitle: 'Tracked changes',
        txtClosePanel: 'Close the list of changes',
        txtAuthor: 'Author',
        txtAllAuthors: 'All authors',
        txtNoChanges: 'There are no tracked changes',
        txtCount: '{0} changes',
        txtCountOf: '{0} of {1} changes',
        txtAccept: 'Accept',
        txtReject: 'Reject',
        txtAcceptChange: 'Accept change by {0}',
        txtRejectChange: 'Reject change by {0}',
        txtAcceptAll: 'Accept all shown',
        txtRejectAll: 'Reject all shown',
        txtConfirmAll: 'Accept all {0} changes shown?',
        txtConfirmRejectAll: 'Reject all {0} changes shown?',
        txtLocked: 'Someone else is editing a paragraph with one of these changes. Nothing was changed.'

    }, DE.Views.ChangesPane || {}));
});
