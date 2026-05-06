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
 * You can contact Ascensio System SIA at 20A-6 Ernesta Birznieka-Upish
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */
/**
 *  FormSettingsSelectFields.js
 *
 *  Created on 04.05.2025
 *
 */
define([], function () { 'use strict';

    PDFE.Views.FormSettingsSelectFields = Common.UI.Window.extend(_.extend({
        options: {
            width: 214,
            header: true,
            style: 'min-width: 214px;',
            cls: 'modal-dlg',
            buttons: ['ok', 'cancel']
        },

        initialize : function(options) {
            this.items = options.items;
            this.checkedItems = options.checkedItems;

            _.extend(this.options, {
                title: this.txtTitle,
                width: 300,
            }, options || {});

            this.template = [
                '<div class="settings-panel active">',
                    '<div class="box">',
                        '<label class="padding-very-small"><%= scope.txtDescription %></label>',
                        '<div class="padding-small">',
                            '<button type="button" class="btn btn-text-default auto" id="select-fields-btn-select" style="min-width: 86px;"><%= scope.txtSelectAll %></button>',
                            '<button type="button" class="btn btn-text-default auto margin-left-5" id="select-fields-btn-deselect" style="min-width: 86px;"><%= scope.txtDeselectAll %></button>',
                        '</div>',
                        '<div id="select-fields-list" style="width:100%; height: 208px;"></div>',
                    '</div>',
                '</div>'
            ].join('');

            this.options.tpl = _.template(this.template)({
                scope: this
            });

            Common.UI.Window.prototype.initialize.call(this, this.options);
        },

        render: function() {
            Common.UI.Window.prototype.render.call(this);

            var me = this,
                $window = me.getChild();

            this.btnSelectAll = new Common.UI.Button({
                el: $window.find('#select-fields-btn-select'),
                disabled: this.items.length == 0
            });
            this.btnSelectAll.on('click', _.bind(this.selectAll, this, true));

            this.btnDeselectAll = new Common.UI.Button({
                el: $window.find('#select-fields-btn-deselect'),
                disabled: this.items.length == 0
            });
            this.btnDeselectAll.on('click', _.bind(this.selectAll, this, false));

            const listItemTemplate = [
                '<div id="<%= id %>" class="list-item" style="display: flex; align-items: center;" role="listitem">',
                    Common.UI.CheckBoxTemplate,
                    '<div style="overflow: hidden; text-overflow: ellipsis;"><%= value %></div>',
                '</div>',
            ].join('');
            this.fieldsList = new Common.UI.ListView({
                el: $window.find('#select-fields-list'),
                store: new Common.UI.DataViewStore(),
                scrollAlwaysVisible: true,
                itemTemplate: _.template(listItemTemplate),
                tabindex: 1
            });
            this.fieldsList.on({
                'item:change': this.onItemChanged.bind(this),
                'item:add': this.onItemChanged.bind(this),
                'item:click': this.onItemClick.bind(this)
            });

            const fieldsNames = this.items;
            this.fieldsList.store.reset(fieldsNames.map(function(fieldName) {
                return {
                    value: fieldName,
                    displayName: fieldName,
                    check: me.checkedItems.includes(fieldName)
                }
            }));

            $window.find('.dlg-btn').on('click', _.bind(this.onBtnClick, this));
        },
        
        selectAll: function(status) {
            this.fieldsList.store.each(function(item) {
                item.set('check', status);
            });
        },

        getFocusedComponents: function() {
            return [this.btnSelectAll, this.btnDeselectAll, this.fieldsList].concat(this.getFooterButtons());
        },

        getDefaultFocusableComponent: function () {
            return this.fieldsList;
        },

        _handleInput: function(state) {
            if (this.options.handler) {
                let selectedFields;
                if (state == 'ok') {
                    selectedFields = [];
                    this.fieldsList.store.each(function(item) {
                        if(item.get('check')) {
                            selectedFields.push(item.get('value'));
                        }
                    });
                }
                this.options.handler.call(this, state, selectedFields);
            }

            this.close();
        },

        onItemClick: function (listView, itemView, record) {
            const event = window.event ? window.event : window._event;
            if(event) {
                record.set('check', !record.get('check'));
            }
        },

        onItemChanged: function (view, record) {
            var state = record.model.get('check');
            if ( state == 'indeterminate' )
                $('input[type=checkbox]', record.$el).prop('indeterminate', true);
            else $('input[type=checkbox]', record.$el).prop({checked: state, indeterminate: false});
        },

        onBtnClick: function(event) {
            this._handleInput(event.currentTarget.attributes['result'].value);
        },

        getSettings: function() {
            return this.currentCell;
        },

        onPrimary: function() {
            this._handleInput('ok');
            return false;
        },

        txtTitle: 'Field selection',
        txtDescription: 'Select fields for calculation',
        txtSelectAll: 'Select all',
        txtDeselectAll: 'Deselect all'

    }, PDFE.Views.FormSettingsSelectFields || {}))
});