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
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
define([], function () {
    'use strict';

    DE.Views.Spellcheck = Common.UI.BaseView.extend(_.extend({
        el: '#left-panel-spellcheck',

        template: _.template([
            '<div id="spellcheck-box" class="layout-ct active">',
                '<div class="spellcheck-settings">',
                    '<div class="spellcheck-settings-inner">',
                        '<div id="spellcheck-progress">',
                            '<div id="spellcheck-progress-label"></div>',
                            '<div class="spellcheck-progress-track"><div id="spellcheck-progress-bar"></div></div>',
                            '<div id="spellcheck-missing-languages" class="hidden"></div>',
                            '<div id="spellcheck-skipped" class="hidden"></div>',
                        '</div>',
                        '<div style="display: flex; width: 100%; padding-bottom: 8px; padding-top: 8px;">',
                            '<div id="spellcheck-current-word"></div>',
                            '<div id="spellcheck-next" style=""></div>',
                        '</div>',
                        '<div id="spellcheck-suggestions-list"></div>',
                        '<div id="spellcheck-ignore-group">',
                            '<div id="spellcheck-ignore"></div>',
                            '<div id="spellcheck-ignore-all"></div>',
                        '</div>',
                        '<button class="btn btn-text-default auto" id="spellcheck-add-to-dictionary" data-hint="1" data-hint-direction="bottom" data-hint-offset="big"><%= scope.txtAddToDictionary %></button>',
                        '<div id="spellcheck-complete" class="hidden">',
                            '<i class="btn-resolve margin-right-10"></i>',
                            '<%= scope.txtComplete %>' ,
                        '</div>',
                    '</div>',
                '</div>',
                '<div id="spellcheck-header">',
                    '<label role="heading"><%= scope.txtSpelling %></label>',
                    '<div id="spellcheck-btn-close" class="float-right margin-left-4"></div>',
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
                parentEl: $('#spellcheck-btn-close', this.$el),
                cls: 'btn-toolbar',
                iconCls: 'toolbar__icon btn-close',
                hint: this.txtClosePanel,
                dataHint: '1',
                dataHintDirection: 'bottom',
                dataHintOffset: 'big'
            });
            this.buttonClose.on('click', _.bind(this.onClickClosePanel, this));

            this.currentWord = new Common.UI.InputField({
                el : $('#spellcheck-current-word', this.$el),
                allowBlank  : true,
                validateOnBlur: false,
                disabled: true,
                dataHint: '1',
                dataHintDirection: 'left',
                dataHintOffset: 'big'
            });

            this.buttonNext = new Common.UI.Button({
                parentEl: $('#spellcheck-next', this.$el),
                cls: 'btn-toolbar bg-white',
                iconCls: 'toolbar__icon btn-nextitem icon-rtl',
                hint: this.txtNextTip,
                dataHint: '1',
                dataHintDirection: 'bottom'
            });

            this.suggestionList = new Common.UI.ListView({
                el: $('#spellcheck-suggestions-list', this.$el),
                emptyText: this.noSuggestions,
                store: new Common.UI.DataViewStore(),
                itemTemplate: _.template([
                    '<div id="<%= id %>" class="list-item spellcheck-suggestion">',
                        '<span class="spellcheck-suggestion-text"><%= Common.Utils.String.htmlEncode(value) %></span>',
                        '<span class="spellcheck-more" title="<%= tip %>">&#8943;</span>',
                    '</div>'
                ].join('')),
                scrollAlwaysVisible: true,
                dataHint: '1',
                dataHintDirection: 'left',
                dataHintOffset: 'big'
            });

            this.menuMore = new Common.UI.Menu({
                style: 'min-width: 110px',
                items: [
                    {
                        caption: this.textChange,
                        value: 0
                    },
                    {
                        caption: this.textChangeAll,
                        value: 1
                    }
                ]
            });

            this.btnIgnore = new Common.UI.Button({
                parentEl: $('#spellcheck-ignore', this.$el),
                cls: 'btn-text-default',
                caption: this.textIgnore,
                width: 110,
                disabled: true,
                dataHint: '1',
                dataHintDirection: 'bottom',
                dataHintOffset: 'big'
            });

            this.btnIgnoreAll = new Common.UI.Button({
                parentEl: $('#spellcheck-ignore-all', this.$el),
                cls: 'btn-text-default',
                caption: this.textIgnoreAll,
                width: 110,
                disabled: true,
                dataHint: '1',
                dataHintDirection: 'bottom',
                dataHintOffset: 'big'
            });

            this.btnToDictionary = new Common.UI.Button({
                el: $('#spellcheck-add-to-dictionary', this.$el),
                disabled    : true
            });

            this.lblComplete = this.$el.find('#spellcheck-complete');
            this.lblProgress = this.$el.find('#spellcheck-progress-label');
            this.barProgress = this.$el.find('#spellcheck-progress-bar');
            this.lblMissingLanguages = this.$el.find('#spellcheck-missing-languages');
            this.lblSkipped = this.$el.find('#spellcheck-skipped');
            this.trigger('render:after', this);

            if (_.isUndefined(this.scroller)) {
                this.scroller = new Common.UI.Scroller({
                    el: this.$el.find('.spellcheck-settings-inner'),
                    suppressScrollX: true,
                    alwaysVisibleY: true
                });
            }

            $(window).on('resize', _.bind(function() {
                this.scroller.update({alwaysVisibleY: true});
            }, this));

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

        showMoreMenu: function(target) {
            var menu = this.menuMore,
                container = $('#spellcheck-more-menu');
            if (!menu.rendered) {
                if (container.length < 1) {
                    container = $('<div id="spellcheck-more-menu" style="position: absolute; z-index: 10000;"><div class="dropdown-toggle" data-toggle="dropdown"></div></div>');
                    $(document.body).append(container);
                }
                menu.render(container);
                menu.cmpEl.attr({tabindex: "-1"});
            }
            var offset = Common.Utils.getOffset($(target));
            container.css({left: offset.left, top: offset.top + $(target).outerHeight()});
            menu.show();
            _.delay(function() {
                menu.cmpEl.focus();
            }, 10);
        },

        onClickClosePanel: function() {
            Common.NotificationCenter.trigger('leftmenu:change', 'hide');
        },

        txtSpelling: 'Spelling',
        noSuggestions: 'No spelling suggestions',
        txtLoadingSuggestions: 'Loading suggestions...',
        textChange: 'Change',
        textChangeAll: 'Change All',
        textIgnore: 'Ignore',
        textIgnoreAll: 'Ignore All',
        txtAddToDictionary: 'Add To Dictionary',
        txtComplete: 'Spellcheck has been complete',
        txtNextTip: 'Go to the next word',
        txtChecking: 'Checking the document: {0}%',
        txtStillChecking: 'Checking the document: {0}%. The next misspelled word appears as soon as it is found.',
        txtCheckedAll: 'The whole document has been checked',
        txtSpellcheckOff: 'Spell checking is turned off in the settings',
        txtMissingLanguages: 'No dictionary for: {0}. Words in these languages are not checked.',
        txtSkippedLocked: '{0} occurrences were not changed because they are locked.',
        txtClosePanel: 'Close spelling',
        tipMoreOptions: 'More options'

    }, DE.Views.Spellcheck || {}));
});
