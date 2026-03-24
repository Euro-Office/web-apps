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
 *  SendForSigningSettings.js
 *
 *  Created on 10.03.2026
 *
 */

define([
    'text!documenteditor/main/app/template/SendForSigningSettings.template',
    'jquery',
    'underscore',
    'backbone',
    'common/main/lib/component/Button'
], function (menuTemplate, $, _, Backbone) {
    'use strict';

    DE.Views.SendForSigningSettings = Backbone.View.extend(_.extend({
        el: '#id-send-for-signing-settings',

        // Compile our stats template
        template: _.template(menuTemplate),

        // Delegated events for creating new items, and clearing completed ones.
        events: {
        },

        options: {
            alias: 'SendForSigningSettings'
        },

        initialize: function (options) {
            this._initSettings = true;
            this._state = {
                isUsersListLoading: false
            };
            this._locked = false;

            this.users = [];
            this.render();


            // TODO: if (config.canRequestUsers)???
            this._state.isUsersListLoading = true;
            Common.UI.ExternalUsers.get('filler');
            Common.NotificationCenter.on('mentions:setusers',   _.bind(this.onUsersListLoad, this));
        },

        render: function () {
            const el = this.$el || $(this.el);
            el.html(this.template({
                scope: this
            }));
        },
        
        createDelayedElements: function() {
            this._initSettings = false;
            const me = this;
            const $markup = this.$el || $(this.el);

            this._updateRolesListHeight();
            this.scrollerOptions = {
                el: $markup.find('#id-send-for-signing-settings-roles-list'),
                wheelSpeed: 8,
                alwaysVisibleY: true
            };
            this.scroller = new Common.UI.Scroller(this.scrollerOptions);

            this.sendBtn = new Common.UI.Button({
                el: $markup.find('#id-send-for-signing-settings-send-btn'),
                disabled: true
            });
            this.sendBtn.on('click', _.bind(this.onSend, this));
            
            this.cancelBtn = $markup.find('#id-send-for-signing-settings-cancel-btn');
            this.cancelBtn.on('click', _.bind(this.onCancel, this));

            const oForm = this.api.asc_GetOForm();
            this.rolesCollection = new Backbone.Collection();
            this.rolesCollection.on('reset', function(newCollection, details) {
                me._renderRolesList();
            }, this);
            this.setRoles(oForm ? oForm.asc_getAllRoles() : []);

            $(window).on('resize', _.bind(this.onWindowResize, this));
        },

        setApi: function(api) {
            this.api = api;
            if (this.api) {
                this.api.asc_registerCallback('asc_onUpdateOFormRoles', _.bind(this.onRefreshRolesList, this));
            }
            return this;
        },

        ChangeSettings: function(props) {
            if (this._initSettings) {
                this.createDelayedElements();
            }
        },

        setLocked: function (locked) {
            this._locked = locked;
        },

        setMode: function(mode) {
            this.mode = mode;
        },

        disableControls: function(disable) {

        },

        updateDisableSendButton: function() {
            const hasEmptyUser = this.rolesCollection.some(function(role) {
                return !role.get('user');
            });
            this.sendBtn.setDisabled(hasEmptyUser);
        },

        setRoles: function(roles) {
            const oldArray = this.rolesCollection.toJSON();
            const oldMap = {};
            const newArray = (roles).map(function(role) {
                role = role.asc_getSettings();
                let color = role.asc_getColor();
                color && (color = Common.Utils.ThemeColor.getHexColor(color.get_r(), color.get_g(), color.get_b()));
                return {
                    name: role.asc_getName(),
                    color: color,
                    user: null
                }
            });

            oldArray.forEach(function(item) {
                oldMap[item.name] = item;
            });

            // Arrays are merged by 'name', only the `user` field is carried over from the old array
            const resultArray = newArray.map(function(item) {
                if (oldMap.hasOwnProperty(item.name)) {
                    item.user = oldMap[item.name].user;
                }
                return item;
            });

            this.rolesCollection.reset(resultArray);
        },

        onUsersListLoad: function(type, users, isPaginated) {
            if (this._state.isUsersListLoading && type!=='filler') return;
            
            this._state.isUsersListLoading = false;
            this.users = (users || []).map(function(user) {
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    initials: Common.Utils.getUserInitials(user.name)
                }
            });
        },

        onSend: function() {
            const roles = this.rolesCollection.map(function(role) {
                return {
                    name: role.get('name'),
                    color: role.get('color'),
                    user: role.get('user')
                }
            });
            DE.getController('Main').onStartFilling(true, roles);
        },

        onCancel: function() {
            // TODO: Move this out of the component by emitting an event
            const rightmenuController = DE.getController('RightMenu');
            rightmenuController.closeSendForSigning();
        },

        onRefreshRolesList: function(roles) {
            if (this._initSettings) return;
            this.setRoles(roles);
        },

        onWindowResize: function() {
            this._updateRolesListHeight();
            this.scroller.update(this.scrollerOptions);
        },

        _renderRolesList: function() {
            const me = this;
            const userCmbOptions = this.users.map(function(user) {
                return Object.assign({value: user.id, displayValue: user.name || user.email}, user);
            });

            this.$el.find('#id-send-for-signing-settings-roles-list').empty();
            this.rolesCollection.each(function(role, index) {
                const $item = $(
                    '<div id="<%= id %>" class="role-item ' + (index == me.rolesCollection.length -1 ? 'last' : '') + '">' + 
                        '<div class="role-item-left">' +
                            '<div class="role-item-number" style="background: #' + role.get('color') + ';">' +
                                (index + 1) +
                            '</div>' +
                            '<div class="role-item-dashes"></div>' +
                        '</div>' +
                        '<div class="role-item-content">' +
                            '<div class="role-item-label">' + role.get('name') + '</div>' +
                            '<div class="role-item-user-cmb"></div>' +
                        '</div>' +
                    '</div>'
                );
                const user = role.get('user');
                const cmb = new Common.UI.ComboBox({
                    el: $item.find('.role-item-user-cmb'),
                    cls: 'input-group-nr',
                    menuCls: 'role-item-user-cmb-menu',
                    restoreMenuHeightAndTop: true,
                    editable: false,
                    data: userCmbOptions,
                    placeHolder: me.txtSelectUser,
                    itemTemplate: _.template(
                        '<li id="<%= id %>" class="item">' + 
                            '<a tabindex="-1" type="menuitem" role="menuitemcheckbox" aria-checked="false">' + 
                                '<% if(image) { %>' + 
                                    '<div class="avatar" style="background-image: url(<%= image %>); background-color: transparent;"></div>' +
                                '<% } else { %>' +
                                    '<div class="avatar">' +
                                        '<i class="icon toolbar__icon btn-user">&nbsp;</i>' +
                                    '</div>' +
                                '<% } %>' +     
                                '<div class="content">' + 
                                    '<div><%= name %></div>' +
                                    '<div class="email"><%= email %></div>' +
                                '</div>' + 
                            '</a>' +
                        '</li>'
                    )
                });
                (user && user.id) && cmb.setValue(user.id);
                cmb.on('selected', function(combo, record) {
                    role.set('user', {
                       id: record.id,
                       name: record.name,
                       email: record.email,
                       image: record.image
                    });
                    me.updateDisableSendButton();
                });
                me.$el.find('#id-send-for-signing-settings-roles-list').append($item);   
            });
            this.updateDisableSendButton();
            this.scroller.update(this.scrollerOptions);
        },

        _updateRolesListHeight: function() {
            const $markup = this.$el || $(this.el);
            const $listWrapper = $markup.find('.roles-list-wrapper');
            const height = $listWrapper.height();
            
            $markup.find('#id-send-for-signing-settings-roles-list').height(height);
        },

        txtTitle: 'Send for signing',
        txtDescription: 'Please check the order of filling before sending.',
        txtSelectUser: 'Select user',
        txtSend: 'Send',
        txtCancel: 'Cancel',

    }, DE.Views.SendForSigningSettings || {}));
});