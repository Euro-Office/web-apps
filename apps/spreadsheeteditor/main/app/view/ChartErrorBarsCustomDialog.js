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

if (Common === undefined)
    var Common = {};

define([], function () { 'use strict';

    SSE.Views.ChartErrorBarsCustomDialog = Common.UI.Window.extend(_.extend({
        options: {
            width   : 350,
            cls     : 'modal-dlg',
            buttons : ['ok', 'cancel']
        },

        initialize: function(options) {
            _.extend(this.options, {
                title: this.txtTitleCustomErrorBars
            }, options);

            this.template = [
                '<div class="box">',
                '<table cols="2" style="width: 100%;">',
                '<tr>',
                    '<td colspan="2">',
                        '<label>' + this.txtPositiveErrorValue + '</label>',
                    '</td>',
                '</tr>',
                '<tr>',
                    '<td style="padding-bottom: 8px;width: 100%;">',
                        '<div id="id-dlg-chart-errbars-plus"></div>',
                    '</td>',
                    '<td style="padding-bottom: 8px;">',
                        '<label id="id-dlg-chart-errbars-lbl-plus" class="margin-left-5" style="width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px;">' + this.txtChoose + '</label>',
                    '</td>',
                '</tr>',
                '<tr>',
                    '<td colspan="2">',
                        '<label>' + this.txtNegativeErrorValue + '</label>',
                    '</td>',
                '</tr>',
                '<tr>',
                    '<td style="padding-bottom: 8px;width: 100%;">',
                        '<div id="id-dlg-chart-errbars-minus"></div>',
                    '</td>',
                    '<td style="padding-bottom: 8px;">',
                        '<label id="id-dlg-chart-errbars-lbl-minus" class="margin-left-5" style="width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px;">' + this.txtChoose + '</label>',
                    '</td>',
                '</tr>',
                '</table>',
                '</div>'
            ].join('');

            this.options.tpl = _.template(this.template)(this.options);

            Common.UI.Window.prototype.initialize.call(this, this.options);
        },

        render: function() {
            Common.UI.Window.prototype.render.call(this);

            var $window = this.getChild(),
                me = this;

            me.inputPlus = new Common.UI.InputFieldBtn({
                el: $('#id-dlg-chart-errbars-plus'),
                style: '100%',
                btnHint: this.textSelectData,
                validateOnBlur: false
            }).on('button:click', _.bind(this.onSelectData, this, 1));
            this.lblPlus = $window.find('#id-dlg-chart-errbars-lbl-plus');

            me.inputMinus = new Common.UI.InputFieldBtn({
                el: $('#id-dlg-chart-errbars-minus'),
                style: '100%',
                btnHint: this.textSelectData,
                validateOnBlur: false
            }).on('button:click', _.bind(this.onSelectData, this, 2));
            this.lblMinus = $window.find('#id-dlg-chart-errbars-lbl-minus');

            $window.find('.dlg-btn').on('click', _.bind(this.onBtnClick, this));
        },

        getFocusedComponents: function() {
            return [this.inputPlus, this.inputMinus].concat(this.getFooterButtons());
        },

        getDefaultFocusableComponent: function () {
            if (this._alreadyRendered) return;
            this._alreadyRendered = true;
            return this.inputPlus;
        },

        onPrimary: function() {
            this._handleInput('ok');
            return false;
        },

        setSettings: function(settings) {
            this.api = settings.api;
            this.chartSettings = settings.chartSettings;

            var custom = (this.chartSettings && this.chartSettings.getErrorBarsCustom)
                ? this.chartSettings.getErrorBarsCustom()
                : { plus: '={1}', minus: '={1}', plusValues: '1', minusValues: '1' };

            this.inputPlus.setValue(custom.plus || '={1}');
            this.lblPlus.text((this.inputPlus.getValue() !== '') ? ('= ' + (custom.plusValues || '')) : this.txtChoose);

            this.inputMinus.setValue(custom.minus || '={1}');
            this.lblMinus.text((this.inputMinus.getValue() !== '') ? ('= ' + (custom.minusValues || '')) : this.txtChoose);
        },

        getSettings: function () {
            return {
                plus: this.inputPlus.getValue(),
                minus: this.inputMinus.getValue()
            };
        },

        onSelectData: function(type, input) {
            var me = this;
            if (me.api) {
                var handlerDlg = function(dlg, result) {
                    if (result == 'ok') {
                        var val = dlg.getSettings();
                        input.setValue(val);
                    }
                };

                var win = new SSE.Views.CellRangeDialog({
                    allowBlank: true,
                    handler: handlerDlg
                }).on('close', function() {
                    me.show();
                    _.delay(function(){
                        me._noApply = true;
                        input.focus();
                        me._noApply = false;
                    }, 1);
                });

                var xy = Common.Utils.getOffset(me.$window);
                me.hide();
                win.show(me.$window, xy);
                win.setSettings({
                    api     : me.api,
                    range   : !_.isEmpty(input.getValue()) ? input.getValue() : '',
                    type    : Asc.c_oAscSelectionDialogType.Chart,
                    validation: function() { return true; }
                });
            }
        },

        isRangeValid: function(value) {
            if (!this.chartSettings || !this.chartSettings.isValidErrorBarsCustom) {
                return true;
            }
            var isvalid = this.chartSettings.isValidErrorBarsCustom(value);
            if (isvalid === true || isvalid == Asc.c_oAscError.ID.No)
                return true;

            var error = this.textInvalidRange;
            switch (isvalid) {
                case Asc.c_oAscError.ID.MaxDataPointsError:
                    error = this.errorMaxPoints;
                    break;
                case Asc.c_oAscError.ID.ErrorInFormula:
                    error = this.errorInFormula;
                    break;
                case Asc.c_oAscError.ID.InvalidReference:
                    error = this.errorInvalidReference;
                    break;
                case Asc.c_oAscError.ID.NoSingleRowCol:
                    error = this.errorNoSingleRowCol;
                    break;
                case Asc.c_oAscError.ID.NoValues:
                    error = this.errorNoValues;
                    break;
            }
            Common.UI.warning({msg: error, maxwidth: 600});
            return false;
        },

        onBtnClick: function(event) {
            this._handleInput(event.currentTarget.attributes['result'].value);
        },

        _handleInput: function(state) {
            if (this.options.handler) {
                if (state == 'ok') {
                    var plusVal = this.inputPlus.getValue();
                    var minusVal = this.inputMinus.getValue();
                    if (!this.isRangeValid(plusVal)) return;
                    if (!this.isRangeValid(minusVal)) return;
                    if (this.chartSettings && this.chartSettings.setErrorBarsCustom) {
                        this.chartSettings.setErrorBarsCustom(plusVal, minusVal);
                    }
                }
                if (this.options.handler.call(this, this, state))
                    return;
            }

            this.close();
        },

        txtTitleCustomErrorBars: 'Custom Error Bars',
        txtPositiveErrorValue: 'Positive Error Value',
        txtNegativeErrorValue: 'Negative Error Value',
        txtChoose: 'Choose range',
        textSelectData: 'Select data',
        textInvalidRange: 'Invalid cells range',
        errorMaxPoints: 'The maximum number of points in series per chart is 4096.',
        errorInFormula: "There's an error in formula you entered.",
        errorInvalidReference: 'The reference is not valid. Reference must be to an open worksheet.',
        errorNoSingleRowCol: 'The reference is not valid. References for titles, values, sizes, or data labels must be a single cell, row, or column.',
        errorNoValues: 'To create a chart, the series must contain at least one value.'

    }, SSE.Views.ChartErrorBarsCustomDialog || {}))
});

