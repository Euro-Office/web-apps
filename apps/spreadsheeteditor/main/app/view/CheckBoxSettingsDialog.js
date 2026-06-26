/*!
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH or an Nextcloud affiliate company and Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

define([
    'common/main/lib/view/AdvancedSettingsWindow'
], function () { 'use strict';

    SSE.Views.CheckBoxSettingsDialog = Common.Views.AdvancedSettingsWindow.extend(_.extend({
        options: {
            contentWidth: 300,
            separator: false,
            id: 'window-checkbox-settings'
        },

        initialize: function (options) {
            var me = this;

            _.extend(this.options, {
                title: me.textTitle,
                contentStyle: 'padding: 5px 5px 0;',
                contentTemplate: _.template([
                    '<div class="settings-panel active">',
                        '<div class="inner-content">',
                            '<table cols="1" style="width: 100%;">',
                                '<tr>',
                                    '<td>',
                                        '<label class="input-label header">' + me.textCellLink + '</label>',
                                    '</td>',
                                '</tr>',
                                '<tr>',
                                    '<td class="padding-small">',
                                        '<div id="checkbox-settings-cell-link" class="input-row"></div>',
                                    '</td>',
                                '</tr>',
                                '<tr>',
                                    '<td class="padding-top-small">',
                                        '<label class="input-label">' + me.textCellLinkHint + '</label>',
                                    '</td>',
                                '</tr>',
                            '</table>',
                        '</div>',
                    '</div>'
                ].join(''))({scope: this})
            }, options);

            this.api     = options.api;
            this.props   = options.props;
            this.handler = options.handler;

            this.options.handler = function (result, value) {
                if (result === 'ok' && me.txtCellLink.checkValidate() !== true) {
                    me.txtCellLink.focus();
                    return true; // prevent close
                }
                if (options.handler)
                    options.handler.call(this, result, me.getSettings());
            };

            Common.Views.AdvancedSettingsWindow.prototype.initialize.call(this, this.options);
        },

        render: function () {
            Common.Views.AdvancedSettingsWindow.prototype.render.call(this);

            var me = this;

            this.txtCellLink = new Common.UI.InputField({
                el            : $('#checkbox-settings-cell-link'),
                name          : 'range',
                style         : 'width: 100%;',
                validateOnBlur: false,
                hideErrorOnInput: true,
                validator     : function (value) {
                    if (!value || value.trim() === '') return true;
                    var result = me.api.asc_checkDataRange(Asc.c_oAscSelectionDialogType.CheckBox, value, true);
                    return result === Asc.c_oAscError.ID.No || me.textInvalidRef;
                }
            });

            this.afterRender();
        },

        afterRender: function () {
            this._setDefaults(this.props);
        },

        getFocusedComponents: function () {
            return [this.txtCellLink].concat(this.getFooterButtons());
        },

        getDefaultFocusableComponent: function () {
            if (this._alreadyRendered) return;
            this._alreadyRendered = true;
            return this.txtCellLink;
        },

        _setDefaults: function (props) {
            if (!props) return;
            this.txtCellLink.setValue(props.fmlaLink || '');
        },

        getSettings: function () {
            return {
                fmlaLink : this.txtCellLink.getValue()
            };
        },

        textTitle        : 'Link Cell',
        textCellLink     : 'Cell reference',
        textCellLinkHint : 'The cell will display TRUE or FALSE depending on the checked state of the checkbox.',
        textInvalidRef   : 'ERROR! Invalid cell reference'
    }, SSE.Views.CheckBoxSettingsDialog || {}));
});
