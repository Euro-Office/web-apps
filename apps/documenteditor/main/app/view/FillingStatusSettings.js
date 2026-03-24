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
 *  FillingStatusSettings.js
 *
 *  Created on 10.03.2026
 *
 */

define([
    'text!documenteditor/main/app/template/FillingStatusSettings.template',
    'jquery',
    'underscore',
    'backbone',
    'common/main/lib/component/Button'
], function (menuTemplate, $, _, Backbone) {
    'use strict';

    DE.Views.FillingStatusSettings = Backbone.View.extend(_.extend({
        el: '#id-filling-status-settings',

        // Compile our stats template
        template: _.template(menuTemplate),

        // Delegated events for creating new items, and clearing completed ones.
        events: {
        },

        options: {
            alias: 'FillingStatusSettings'
        },

        initialize: function () {
            this._state = {};
            this._locked = false;

            this.render();
        },

        render: function () {
            const items = [
                { email: 'user333@gmail.com', name: 'Anyone', date: '1/20/2026 9:00 PM', status: 'done' },
                { email: 'test@yandex.ru', name: 'User1', date: null, status: 'done' },
                { email: 'test@yandex.ru', name: 'User2', date: null, status: 'done' }
            ];
            const el = this.$el || $(this.el);
            el.html(this.template({
                scope: this,
                items: items,
                isAllDone: items.every(function(item) { return item.status == 'done'})
            }));
        },

        setApi: function(api) {
            this.api = api;
            return this;
        },

        ChangeSettings: function(props) {

        },

        setLocked: function (locked) {
            this._locked = locked;
        },

        setMode: function(mode) {
            this.mode = mode;
        },

        disableControls: function(disable) {

        },

        txtTitle: 'Filling status',

    }, DE.Views.FillingStatusSettings || {}));
});