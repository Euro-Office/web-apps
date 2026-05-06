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
 *  FormSettingsAdvanced.js
 *
 *  Created on 25.03.2025
 *
 */

define([
    'text!pdfeditor/main/app/template/FormSettingsAdvanced.template',
    'common/main/lib/view/AdvancedSettingsWindow',
    'pdfeditor/main/app/view/FormSettingsSelectFields',
], function (contentTemplate) { 'use strict';

    PDFE.Views.FormSettingsAdvanced = Common.Views.AdvancedSettingsWindow.extend(_.extend({
        options: {
            contentWidth: 300,
            contentHeight: 345
        },

        initialize : function(options) {
            var me = this;

            this.api        = options.api;
            this.handler    = options.handler;
            this.props      = options.props;
            this.actionsProps = options.actionsProps;

            this._changedProps = new Asc.asc_CFieldActionsProperty();

            _.extend(this.options, {
                title: this.textTitle,
                items: [
                    {panelId: 'id-adv-form-format',    panelCaption: this.textFormat},
                    {panelId: 'id-adv-form-validate',    panelCaption: this.textValidate},
                    {panelId: 'id-adv-form-calculate',    panelCaption: this.textCalculate}
                ],
                contentHeight: 345,
                contentStyle: 'padding: 5px; position:relative;',
                contentTemplate: _.template(contentTemplate)({
                    scope: this
                })
            }, options);

            Common.Views.AdvancedSettingsWindow.prototype.initialize.call(this, this.options);

            this._state = {DateFormatCustom: '', DateFormat: '', TimeFormat: 0, NegStyle: AscPDF.NegativeStyle.BLACK_MINUS, Mask: '*', RegExp: '.'};
            this.FormatType = AscPDF.FormatType.NONE;
        },

        render: function() {
            Common.Views.AdvancedSettingsWindow.prototype.render.call(this);
            var me = this;

            // Format
            this.cmbFormat = new Common.UI.ComboBox({
                el: $('#format-settings-combo-format'),
                cls: 'input-group-nr',
                menuStyle: 'min-width: 100%;',
                editable: false,
                data: [{ displayValue: this.textNone,  value: AscPDF.FormatType.NONE },
                    { displayValue: this.textNumber,  value: AscPDF.FormatType.NUMBER },
                    { displayValue: this.textPercent,  value: AscPDF.FormatType.PERCENTAGE },
                    { displayValue: this.textDate,  value: AscPDF.FormatType.DATE },
                    { displayValue: this.textTime,  value: AscPDF.FormatType.TIME },
                    { displayValue: this.textSpecial,  value: AscPDF.FormatType.SPECIAL },
                    { displayValue: this.textCustom,  value: AscPDF.FormatType.CUSTOM },
                ],
                takeFocusOnClose: true
            });
            this.cmbFormat.setValue(this.FormatType);
            this.cmbFormat.on('selected', _.bind(function(combo, record) {
                this.onFormatSelect(combo, record);
                this.updateChangedProps();
            }, this));

            this.spnDecimal = new Common.UI.MetricSpinner({
                el: $('#format-settings-spin-decimal'),
                step: 1,
                width: 45,
                defaultUnit : "",
                value: 2,
                maxValue: 30,
                minValue: 0,
                allowDecimal: false
            });
            this.spnDecimal.on('change', _.bind(function(field, newValue, oldValue, eOpts) {
                this.putFormatPropValue('asc_putDecimals', field.getNumberValue());
                this.updateFormatExample();
            }, this));

            this.cmbSeparator = new Common.UI.ComboBox({
                el: $('#format-settings-combo-separator'),
                cls: 'input-group-nr',
                menuStyle: 'min-width: 100%;max-height:235px;',
                editable: false,
                data: [
                    { displayValue: "1,234.56",  value: AscPDF.SeparatorStyle.COMMA_DOT },
                    { displayValue: "1234.56",  value: AscPDF.SeparatorStyle.NO_SEPARATOR },
                    { displayValue: "1.234,56",  value: AscPDF.SeparatorStyle.DOT_COMMA },
                    { displayValue: "1234,56",  value: AscPDF.SeparatorStyle.NO_SEPARATOR_COMMA },
                    { displayValue: "1'234.56",  value: AscPDF.SeparatorStyle.APOSTROPHE_DOT }
                ],
                scrollAlwaysVisible: true,
                takeFocusOnClose: true,
                search: true
            });
            this.cmbSeparator.setValue(AscPDF.SeparatorStyle.COMMA_DOT);
            this.cmbSeparator.on('selected', _.bind(function(combo, record) {
                this.putFormatPropValue('asc_putSepStyle', record.value);
                this.updateFormatExample();
            }, this));

            let currencySymbolsData = [];
            this.api.asc_getNumberFormatCurrencySymbols().forEach(function(item){
                currencySymbolsData.push({
                    value: item,
                    displayValue: item
                });
            });
            currencySymbolsData.unshift({value: null, displayValue: me.textNone});
            this.cmbSymbols = new Common.UI.ComboBox({
                el: $('#format-settings-combo-symbols'),
                cls: 'input-group-nr',
                menuStyle: 'min-width: 100%;max-height:235px;',
                editable: false,
                data: currencySymbolsData,
                scrollAlwaysVisible: true,
                takeFocusOnClose: true,
                search: true
            });
            this.cmbSymbols.setValue(null);
            this.cmbSymbols.on('selected', _.bind(function(combo, record) {
                this.putFormatPropValue('asc_putCurrency', this.getSymbolValue());
                this.cmbLocation.setDisabled(record.value===null);
                this.updateFormatExample();
            }, this));

            this.cmbLocation = new Common.UI.ComboBox({
                el: $('#format-settings-combo-location'),
                cls: 'input-group-nr',
                menuStyle: 'min-width: 100%;max-height:235px;',
                editable: false,
                data: [
                    { displayValue: this.textBeforeSpace,  value: 0 },
                    { displayValue: this.textBefore,  value: 1 },
                    { displayValue: this.textAfterSpace,  value: 2 },
                    { displayValue: this.textAfter,  value: 3 }
                ],
                scrollAlwaysVisible: true,
                takeFocusOnClose: true
            });
            this.cmbLocation.setValue(0);
            this.cmbLocation.setDisabled(true);
            this.cmbLocation.on('selected', _.bind(function(combo, record) {
                this.putFormatPropValue('asc_putCurrencyPrepend', record.value < 2);
                this.putFormatPropValue('asc_putCurrency', this.getSymbolValue());
                this.updateFormatExample();
            }, this));

            this.chParens = new Common.UI.CheckBox({
                el: $('#format-settings-chk-parens'),
                labelText: this.textParens
            });
            this.chParens.on('change', _.bind(this.onNegativeChange, this));

            this.chRed = new Common.UI.CheckBox({
                el: $('#format-settings-chk-red'),
                labelText: this.textRed
            });
            this.chRed.on('change', _.bind(this.onNegativeChange, this));

            this.dateTimeList = new Common.UI.ListView({
                el: $('#format-settings-list-format'),
                store: new Common.UI.DataViewStore(),
                tabindex: 1,
                itemTemplate: _.template('<div id="<%= id %>" class="list-item" style="pointer-events:none;overflow: hidden; text-overflow: ellipsis;"><%= Common.Utils.String.htmlEncode(displayValue) %></div>')
            });
            this.dateTimeList.on('item:select', _.bind(this.onDateTimeListSelect, this));
            this.dateTimeList.on('entervalue', _.bind(this.onPrimary, this));

            this.inputCustomFormat = new Common.UI.InputField({
                el               : $('#format-settings-txt-custom'),
                allowBlank       : true,
                validateOnChange : true,
                validation       : function () { return true; }
            }).on ('changing', function (input, value) {
                me._state.DateFormat = value;
                me.lblExample.text(me.api.asc_getFieldDateTimeFormatExample(value));
                me.putFormatPropValue('asc_putFormat', value);
            });

            this.cmbSpecial = new Common.UI.ComboBox({
                el: $('#format-settings-special'),
                cls: 'input-group-nr',
                menuStyle: 'min-width: 100%;max-height:235px;',
                editable: false,
                data: [
                    { displayValue: this.textZipCode,  value: AscPDF.SpecialFormatType.ZIP_CODE },
                    { displayValue: this.textZipCode4,  value: AscPDF.SpecialFormatType.ZIP_PLUS_4 },
                    { displayValue: this.textPhone,  value: AscPDF.SpecialFormatType.PHONE },
                    { displayValue: this.textSSN,  value: AscPDF.SpecialFormatType.SSN },
                    { displayValue: this.textMask, value: -1 }],
                scrollAlwaysVisible: true,
                takeFocusOnClose: true
            });
            this.cmbSpecial.setValue(AscPDF.SpecialFormatType.PHONE);
            this.cmbSpecial.on('selected', this.onSpecialChanged.bind(this));

            this.txtMask = new Common.UI.InputField({
                el          : $('#format-settings-mask'),
                allowBlank  : true,
                validateOnChange : true,
                validateOnBlur: false,
                style       : 'width: 100%;',
                value       : '',
                dataHint    : '1',
                dataHintDirection: 'left',
                dataHintOffset: 'small'
            }).on ('changing', function (input, value) {
                me._state.Mask = value;
                me.putFormatPropValue('asc_putMask', me._state.Mask);
            });

            this.textareaFormat = new Common.UI.TextareaField({
                el: $('#format-settings-textarea-format'),
                rows: 5
            });
            this.textareaFormat.on('changed:after', _.bind(function(input, newValue, oldValue, e) {
                this.putFormatPropValue('asc_putScript', newValue, 'format');
            }, this));

            this.textareaKeystroke = new Common.UI.TextareaField({
                el: $('#format-settings-textarea-keystroke'),
                rows: 5
            });
            this.textareaKeystroke.on('changed:after', _.bind(function(input, newValue, oldValue, e) {
                this.putFormatPropValue('asc_putScript', newValue, 'keystroke');
            }, this));


            //Validate
            this.radioValidateNone = new Common.UI.RadioBox({
                el: $('#format-settings-radio-validate-none'),
                name: 'form-settings-validate',
                labelText: this.textValidateNone,
            });
            this.radioValidateNone.on('change', _.bind(this.onValidateTypeChange, this, 'none'));

            this.radioValidateRange = new Common.UI.RadioBox({
                el: $('#format-settings-radio-validate-range'),
                name: 'form-settings-validate',
                labelText: this.textValidateRange
            });
            this.radioValidateRange.on('change', _.bind(this.onValidateTypeChange, this, 'range'));

            this.spnValidateMin = new Common.UI.MetricSpinner({
                el: $('#format-settings-spin-validate-min'),
                step: 1,
                width: 80,
                defaultUnit : "",
                allowBlank: true,
                value: '',
                maxValue: 999999,
                minValue: -999999
            });
            this.spnValidateMin.on('change', _.bind(this.onValidateRangeChange, this));

            this.spnValidateMax = new Common.UI.MetricSpinner({
                el: $('#format-settings-spin-validate-max'),
                step: 1,
                width: 80,
                defaultUnit : "",
                allowBlank: true,
                value: '',
                maxValue: 999999,
                minValue: -999999
            });
            this.spnValidateMax.on('change', _.bind(this.onValidateRangeChange, this));

            this.radioValidateScript = new Common.UI.RadioBox({
                el: $('#format-settings-radio-validate-script'),
                name: 'form-settings-validate',
                labelText: this.textValidateScript
            });
            this.radioValidateScript.on('change', _.bind(this.onValidateTypeChange, this, 'script'));

            this.textareaValidateScript = new Common.UI.TextareaField({
                el: $('#format-settings-textarea-validate-script'),
                rows: 6
            });
            this.textareaValidateScript.on('changed:after', _.bind(function(input, newValue, oldValue, e) {
                this._changedProps.asc_getValidate().asc_putScript(newValue);
            }, this));


            //Calculate
            this.radioCalculateNone = new Common.UI.RadioBox({
                el: $('#format-settings-radio-calculate-none'),
                name: 'form-settings-calculate',
                labelText: this.textCalculateNone,
            });
            this.radioCalculateNone.on('change', _.bind(this.onCalculateTypeChange, this, 'none'));

            this.radioCalculateOperation = new Common.UI.RadioBox({
                el: $('#format-settings-radio-calculate-operation'),
                name: 'form-settings-calculate',
                labelText: this.textCalculateOperation
            });
            this.radioCalculateOperation.on('change', _.bind(this.onCalculateTypeChange, this, 'operation'));
            
            this.cmbCalculateOperation = new Common.UI.ComboBox({
                el: $('#format-settings-cmb-operation'),
                cls: 'input-group-nr',
                style: 'width: 50%;',
                menuStyle: 'min-width: 100%;',
                editable: false,
                data: [
                    { displayValue: this.textSum + ' (+)',  value: AscPDF.CalculateOperation.sum },
                    { displayValue: this.textProduct + ' (x)',  value: AscPDF.CalculateOperation.product },
                    { displayValue: this.textAverage,  value: AscPDF.CalculateOperation.average },
                    { displayValue: this.textMinimum,  value: AscPDF.CalculateOperation.min },
                    { displayValue: this.textMaximum,  value: AscPDF.CalculateOperation.max },
                ],
                takeFocusOnClose: true
            });
            this.cmbCalculateOperation.setValue(AscPDF.CalculateOperation.sum, true);
            this.cmbCalculateOperation.on('selected', function(cmb, record) {
                const calculate = me._changedProps.asc_getCalculate();
                calculate && calculate.asc_putType(record.value);
            });
                        
            this.textareaCalculateOperation = new Common.UI.TextareaField({
                el: $('#format-settings-textarea-calculate-operation'),
                rows: 2
            });
            this.textareaCalculateOperation.getFields = function() {
                return me.textareaCalculateOperation._fields || [];
            };
            this.textareaCalculateOperation.setFields = function(fields) {
                !fields && (fields = []);
                me.textareaCalculateOperation._fields = fields;
                me.textareaCalculateOperation.setValue(fields.join(', '));

                const calculate = me._changedProps.asc_getCalculate();
                calculate && calculate.asc_putNames(fields);
            };

            this.btnCalculateSelectFields = new Common.UI.Button({
                el: $('#format-settings-btn-calculate-select-fields')
            });
            this.btnCalculateSelectFields.on('click', function() {
                const win = new PDFE.Views.FormSettingsSelectFields({
                    items: me.api.GetAllFieldsNames(),
                    checkedItems: me.textareaCalculateOperation.getFields(),
                    handler: function(state, selectedFields) {
                        if(state == 'ok') {
                            me.textareaCalculateOperation.setFields(selectedFields);
                        }
                    }
                });
                win.show();
                win.on('close', function() {
                    me.btnCalculateSelectFields.$el.focus();
                });
            })

            this.radioCalculateScript = new Common.UI.RadioBox({
                el: $('#format-settings-radio-calculate-script'),
                name: 'form-settings-calculate',
                labelText: this.textCalculateScript
            });
            this.radioCalculateScript.on('change', _.bind(this.onCalculateTypeChange, this, 'script'));

            this.textareaCalculateScript = new Common.UI.TextareaField({
                el: $('#format-settings-textarea-calculate-script'),
                rows: 6
            });
            this.textareaCalculateScript.on('changed:after', _.bind(function(input, newValue, oldValue, e) {
                this._changedProps.asc_getCalculate().asc_putScript(newValue);
            }, this));

            var arr = [];
            this.api.asc_getFieldDateFormatOptions().forEach(function(item){
                arr.push({
                    value: item,
                    displayValue: item
                });
            });
            this.dateFormats = arr.concat({value: '', displayValue: this.txtCustom, isCustom: true});

            arr = [];
            var timearr = this.api.asc_getFieldTimeFormatOptions(),
                valarr = [];
            for (let str in timearr) {
                if(timearr.hasOwnProperty(str)) {
                    arr.push({
                        value: timearr[str],
                        displayValue: str
                    });
                    valarr[timearr[str]] = str;
                }
            }
            this.timeFormats = arr;
            this.timeVal2Str = valarr;

            this._decimalPanel      = this.$window.find('.format-decimal');
            this._numberPanel     = this.$window.find('.format-number');
            this._separatorPanel    = this.$window.find('.format-separator');
            this._specialPanel         = this.$window.find('.form-special');
            this._maskPanel      = this.$window.find('.form-special-mask');
            this._datePanel         = this.$window.find('.format-date-time');
            this._examplePanel       = this.$window.find('.format-example');
            this._customPanel       = this.$window.find('.format-custom');

            this.lblExample         = this.$window.find('#format-settings-label-example');

            this.afterRender();
        },

        getFocusedComponents: function() {
            return this.btnsCategory.concat([
                //Format tab
                this.cmbFormat, this.spnDecimal, this.cmbSeparator, this.cmbSymbols, this.cmbLocation, 
                this.chParens, this.chRed, this.dateTimeList, this.inputCustomFormat, this.cmbSpecial, this.txtMask, 
                this.textareaFormat, this.textareaKeystroke,

                //Validate tab
                this.radioValidateNone, this.radioValidateRange, this.spnValidateMin, this.spnValidateMax, 
                this.radioValidateScript, this.textareaValidateScript,

                //Calculate tab
                this.radioCalculateNone, this.radioCalculateOperation, this.cmbCalculateOperation, 
                this.textareaCalculateOperation, this.btnCalculateSelectFields, 
                this.radioCalculateScript, this.textareaCalculateScript
            ]).concat(this.getFooterButtons());
        },

        getDefaultFocusableComponent: function () {
            return this.cmbFormat;
        },

        afterRender: function() {
            this._setDefaults(this.props, this.actionsProps);
        },

        show: function() {
            Common.Views.AdvancedSettingsWindow.prototype.show.apply(this, arguments);
        },

        _setDefaults: function (specProps, actionsProps) {
            if (specProps) {
                // Format
                let format = actionsProps.asc_getFormat();
                !format && (format = actionsProps.asc_getKeystroke());
                let val = format ? format.asc_getType() : AscPDF.FormatType.NONE;
                this.cmbFormat.setValue((val !== null && val !== undefined) ? val : AscPDF.FormatType.NONE, '');
                this.FormatType=val;
                this.onFormatSelect(this.cmbFormat, this.cmbFormat.getSelectedRecord());
                
                if (this.FormatType===AscPDF.FormatType.SPECIAL) {
                    val = format.asc_getFormat();
                    this._state.SpecialType = (val===undefined) ? -1 : val;
                }

                if (this.FormatType===AscPDF.FormatType.DATE || this.FormatType===AscPDF.FormatType.TIME) {
                    val = format.asc_getFormat();
                    var selectedItem = this.dateTimeList.store.findWhere({value: val});
                    this.inputCustomFormat.setVisible(this.FormatType===AscPDF.FormatType.DATE && !selectedItem);
                    if(this.FormatType===AscPDF.FormatType.DATE && !selectedItem) {
                        selectedItem = this.dateTimeList.store.findWhere({isCustom: true});
                        selectedItem && selectedItem.set({value: val});
                        this.inputCustomFormat.setValue(val);
                        this._state.DateFormatCustom = val;
                    }
                    if(selectedItem) {
                        this.dateTimeList.selectRecord(selectedItem);
                        this.dateTimeList.scrollToRecord(selectedItem);
                    }
                    this._state[this.FormatType===AscPDF.FormatType.DATE ? 'DateFormat' : 'TimeFormat'] = val;
                } else if (this.FormatType===AscPDF.FormatType.NUMBER || this.FormatType===AscPDF.FormatType.PERCENTAGE) {
                    this.spnDecimal.setValue(format.asc_getDecimals());
                    this.cmbSeparator.setValue(format.asc_getSepStyle(), '');
                    if (this.FormatType===AscPDF.FormatType.NUMBER) {
                        val = format.asc_getCurrency();
                        this.cmbSymbols.setValue(val ? val.trim() : null, '');
                        this.cmbLocation.setDisabled(!val);
                        if (val && val.indexOf(' ')===-1)
                            this.cmbLocation.setValue(format.asc_getCurrencyPrepend() ? 1 : 3);
                        else
                            this.cmbLocation.setValue(format.asc_getCurrencyPrepend() ? 0 : 2);
                        val = format.asc_getNegStyle();
                        this._state.NegStyle = val;
                        this.chParens.setValue(val===AscPDF.NegativeStyle.PARENS_BLACK || val===AscPDF.NegativeStyle.PARENS_RED, true);
                        this.chRed.setValue(val===AscPDF.NegativeStyle.RED_MINUS || val===AscPDF.NegativeStyle.PARENS_RED, true);
                    }
                } if (this.FormatType===AscPDF.FormatType.SPECIAL) {
                    this.cmbSpecial.setValue(this._state.SpecialType, '');
                    if (this._state.SpecialType===-1) {
                        this._state.Mask = format.asc_getMask() || '';
                        this.txtMask.setValue(this._state.Mask);
                    }
                } if(this.FormatType===AscPDF.FormatType.CUSTOM) {
                    const origFormat = actionsProps.asc_getFormat();
                    const origKeystroke = actionsProps.asc_getKeystroke();
                    origFormat && this.textareaFormat.setValue(origFormat.asc_getScript());
                    origKeystroke && this.textareaKeystroke.setValue(origKeystroke.asc_getScript());
                }
                this.updateChangedProps();
                this.updateFormatExample();

                // Validate
                const validate = actionsProps.asc_getValidate();
                let radioField = this.radioValidateNone; 
                if(validate) {
                    val = validate.asc_getGreaterThen();
                    if(val != null) {
                        this.spnValidateMin.setValue(val, true);
                        radioField = this.radioValidateRange;
                    }

                    val = validate.asc_getLessThen();
                    if(val != null) {
                        this.spnValidateMax.setValue(val, true);
                        radioField = this.radioValidateRange;
                    }

                    val = validate.asc_getScript();
                    if(val != null) {
                        this.textareaValidateScript.setValue(val, true);
                        radioField = this.radioValidateScript;
                    }
                }
                radioField.setValue(true);

                //Calculate
                const calculate = actionsProps.asc_getCalculate();
                radioField = this.radioCalculateNone; 
                if(calculate) {
                    val = calculate.asc_getType();
                    this.cmbCalculateOperation.setValue(val);

                    val = calculate.asc_getNames();
                    if(val && val.length > 0) {
                        this.textareaCalculateOperation.setFields(val);
                        radioField = this.radioCalculateOperation;
                    }

                    val = calculate.asc_getScript();
                    if(val != null) {
                        this.textareaCalculateScript.setValue(val, true);
                        radioField = this.radioCalculateScript;
                    }
                }
                radioField.setValue(true);
            }
        },

        setFormatType: function(type) {
            this.cmbFormat.setValue(type);
            this.onFormatSelect(this.cmbFormat, this.cmbFormat.getSelectedRecord());
            this.updateChangedProps();
        },

        getSettings: function () {
            return {FormatType: this.FormatType, actionsProps: this._changedProps};
        },

        getSymbolValue: function() {
            let symbol = this.cmbSymbols.getValue();
            const location = this.cmbLocation.getValue();
            if (symbol && (location===0 || location===2)) {
                symbol = location===0 ? symbol + ' ' : ' ' + symbol;
            }
            return symbol || '';
        },

        onDlgBtnClick: function(event) {
            var me = this;
            var state = (typeof(event) == 'object') ? event.currentTarget.attributes['result'].value : event;
            if (state == 'ok') {
                this.handler && this.handler.call(this, state,  (state == 'ok') ? this.getSettings() : undefined);
            }

            this.close();
        },

        onPrimary: function() {
            this.onDlgBtnClick('ok');
            return false;
        },

        updateFormatExample: function() {
            let str = '';
            switch (this.FormatType) {
                case AscPDF.FormatType.NUMBER:
                    const location = this.cmbLocation.getValue();
                    const symbol = this.getSymbolValue();
                    str = this.api.asc_getFieldNumberFormatExample(this.spnDecimal.getNumberValue(), this.cmbSeparator.getValue(), this._state.NegStyle, symbol || '', location<2);
                    break;
                case AscPDF.FormatType.PERCENTAGE:
                    str = this.api.asc_getFieldPercentFormatExample(this.spnDecimal.getNumberValue(), this.cmbSeparator.getValue());
                    break;
                case AscPDF.FormatType.DATE:
                    str = this.api.asc_getFieldDateTimeFormatExample(this._state.DateFormat);
                    break;
                case AscPDF.FormatType.TIME:
                    str = this.api.asc_getFieldDateTimeFormatExample(this.timeVal2Str[this._state.TimeFormat]);
                    break;
            }
            this.lblExample.toggleClass('red-color', this.FormatType===AscPDF.FormatType.NUMBER && (this._state.NegStyle===AscPDF.NegativeStyle.PARENS_RED || this._state.NegStyle===AscPDF.NegativeStyle.RED_MINUS));
            this.lblExample.text(str);
        },

        putFormatPropValue: function(methodName, value, type) {
            const format = this._changedProps.asc_getFormat();
            const keystroke = this._changedProps.asc_getKeystroke();
            if((!type || type == 'format') && format && format[methodName]) {
                format[methodName](value);
            }
            if((!type || type == 'keystroke') && keystroke && keystroke[methodName]) {
                keystroke[methodName](value);
            }
        },

        updateChangedProps: function() {
            let format, keystroke;
            switch(this.FormatType) {
                case AscPDF.FormatType.NONE:
                    format = undefined;
                    keystroke = undefined;
                    break;
                case AscPDF.FormatType.NUMBER:
                    format = new Asc.asc_CFieldNumberFormatProperty();
                    keystroke = new Asc.asc_CFieldNumberFormatProperty();
                    break;
                case AscPDF.FormatType.PERCENTAGE:
                    format = new Asc.asc_CFieldPercentageFormatProperty();
                    keystroke = new Asc.asc_CFieldPercentageFormatProperty();
                    break;
                case AscPDF.FormatType.DATE:
                    format = new Asc.asc_CFieldDateFormatProperty();
                    keystroke = new Asc.asc_CFieldDateFormatProperty();
                    break;
                case AscPDF.FormatType.TIME:
                    format = new Asc.asc_CFieldTimeFormatProperty();
                    keystroke = new Asc.asc_CFieldTimeFormatProperty();
                    break;
                case AscPDF.FormatType.SPECIAL:
                    format = new Asc.asc_CFieldSpecialFormatProperty();
                    keystroke = new Asc.asc_CFieldSpecialFormatProperty();
                    break;
                case AscPDF.FormatType.CUSTOM:
                    format = new Asc.asc_CFieldCustomFormatProperty();
                    keystroke = new Asc.asc_CFieldCustomFormatProperty();
                    break;
            }
            this._changedProps.asc_putFormat(format);
            this._changedProps.asc_putKeystroke(keystroke);

            this.putFormatPropValue('asc_putDecimals', this.spnDecimal.getNumberValue());
            this.putFormatPropValue('asc_putSepStyle', this.cmbSeparator.getValue());
            this.putFormatPropValue('asc_putCurrency', this.getSymbolValue());
            this.putFormatPropValue('asc_putCurrencyPrepend', this.cmbLocation.getValue() < 2);
            this.putFormatPropValue('asc_putMask', this._state.Mask);
            this.putFormatPropValue('asc_putScript', this.textareaFormat.getValue(), 'format');
            this.putFormatPropValue('asc_putScript', this.textareaKeystroke.getValue(), 'keystroke');
            this.putFormatPropValue('asc_putNegStyle', this._state.NegStyle);
            if(this.FormatType===AscPDF.FormatType.DATE) {
                this.putFormatPropValue('asc_putFormat', this._state.DateFormat);
            } else if(this.FormatType===AscPDF.FormatType.TIME) {
                this.putFormatPropValue('asc_putFormat', this._state.TimeFormat);
            } else if(this.FormatType===AscPDF.FormatType.SPECIAL) {
                this.putFormatPropValue('asc_putFormat', this._state.SpecialType);
            }
        },

        onNegativeChange: function(field, newValue, oldValue, eOpts){
            var isRed = this.chRed.getValue()==='checked',
                isParens = this.chParens.getValue()==='checked';
            this._state.NegStyle = isRed ? (isParens ? AscPDF.NegativeStyle.PARENS_RED : AscPDF.NegativeStyle.RED_MINUS) :
                                            isParens ? AscPDF.NegativeStyle.PARENS_BLACK : AscPDF.NegativeStyle.BLACK_MINUS;
            this.putFormatPropValue('asc_putNegStyle', this._state.NegStyle);
            this.updateFormatExample();
        },

        onDateTimeListSelect: function(listView, itemView, record){
            if (!record) return;
            const isDate = this.FormatType===AscPDF.FormatType.DATE;
            const isCustom = isDate && !!record.get('isCustom');
            const value = isCustom ? this.inputCustomFormat.getValue() : record.get('value');

            this.inputCustomFormat.setVisible(isCustom);
            isCustom && this.inputCustomFormat.setValue(this._state.DateFormatCustom);
            this._state[this.FormatType===AscPDF.FormatType.DATE ? 'DateFormat' : 'TimeFormat'] = value;
            this.putFormatPropValue('asc_putFormat', value);
            this.updateFormatExample();
        },

        onSpecialChanged: function(combo, record) {
            this._state.SpecialType = record.value;
            this._maskPanel.toggleClass('hidden', this._state.SpecialType!==-1);
            if(this._state.SpecialType===-1) {
                this.txtMask.setValue(this._state.Mask);
                this.putFormatPropValue('asc_putMask', this._state.Mask);
            }
            this.putFormatPropValue('asc_putFormat', this._state.SpecialType);
            this.updateFormatExample();
        },

        onValidateTypeChange: function(type, field, newValue) {
            let min, max, script;
            let validate = this._changedProps.asc_getValidate();
            if(!validate) {
                this._changedProps.asc_putValidate(new Asc.asc_CFieldValidateProperty());
                validate = this._changedProps.asc_getValidate();
            }
            
            if(type == 'range') {
                let val = this.spnValidateMin.getNumberValue();
                min = Number.isNaN(val) ? undefined : val;
                
                val = this.spnValidateMax.getNumberValue();
                max = Number.isNaN(val) ? undefined : val;
                
                if(min != null && max != null) {
                    const tempMin = min;
                    min = Math.min(min, max);
                    max = Math.max(tempMin, max);
                }

                script = undefined;
            } else if(type == 'script') {
                script = this.textareaValidateScript.getValue();
            }
            validate.asc_putGreaterThen(min);
            validate.asc_putLessThen(max);
            validate.asc_putScript(script);

            this.spnValidateMin.setDisabled(type != 'range');
            this.spnValidateMax.setDisabled(type != 'range');
            this.textareaValidateScript.setDisabled(type != 'script');
        },

        onValidateRangeChange: function() {
            const validate = this._changedProps.asc_getValidate();
            if(validate) {
                let val = this.spnValidateMin.getNumberValue();
                let min = Number.isNaN(val) ? undefined : val;
                
                val = this.spnValidateMax.getNumberValue();
                let max = Number.isNaN(val) ? undefined : val;
    
                if(min != null && max != null) {
                    const tempMin = min;
                    min = Math.min(min, max);
                    max = Math.max(tempMin, max);
                }
    
                validate.asc_putGreaterThen(min);
                validate.asc_putLessThen(max);
            }
        },

        onCalculateTypeChange: function(type, field, newValue) {
            let operation, names, script;
            let calculate = this._changedProps.asc_getCalculate();
            if(!calculate) {
                this._changedProps.asc_putCalculate(new Asc.asc_CFieldCalculateProperty());
                calculate = this._changedProps.asc_getCalculate();
            }
            
            if(type == 'operation') {
                operation = this.cmbCalculateOperation.getValue();
                names = this.textareaCalculateOperation.getFields();
                script = undefined;
            } else if(type == 'script') {
                script = this.textareaCalculateScript.getValue();
            }
            calculate.asc_putType(operation);
            calculate.asc_putNames(names);
            calculate.asc_putScript(script);

            this.cmbCalculateOperation.setDisabled(type != 'operation');
            this.textareaCalculateOperation.setDisabled(type != 'operation');
            this.btnCalculateSelectFields.setDisabled(type != 'operation');
            this.textareaCalculateScript.setDisabled(type != 'script');
        },
        
        onFormatSelect: function(combo, record) {
            if (!record) return;

            this.FormatType = record.value;

            var isNumber = this.FormatType === AscPDF.FormatType.NUMBER,
                isPercent = this.FormatType === AscPDF.FormatType.PERCENTAGE,
                isNumeric = isNumber || isPercent;

            this._decimalPanel.toggleClass('hidden', !(isNumber || isPercent));
            this._separatorPanel.toggleClass('hidden', !(isNumber || isPercent));
            this._numberPanel.toggleClass('hidden', !isNumber);
            this._specialPanel.toggleClass('hidden', this.FormatType!==AscPDF.FormatType.SPECIAL);
            this._customPanel.toggleClass('hidden', this.FormatType!==AscPDF.FormatType.CUSTOM);
            this._maskPanel.toggleClass('hidden', !(this.FormatType===AscPDF.FormatType.SPECIAL && this._state.SpecialType===-1));
            if (this.FormatType===AscPDF.FormatType.SPECIAL && this._state.SpecialType===-1)
                this.txtMask.setValue(this._state.Mask);

            this._datePanel.toggleClass('hidden', !(this.FormatType===AscPDF.FormatType.DATE || this.FormatType===AscPDF.FormatType.TIME));
            if (this.FormatType===AscPDF.FormatType.DATE || this.FormatType===AscPDF.FormatType.TIME) {
                this.dateTimeList.$el[0].style.height = this.FormatType===AscPDF.FormatType.DATE ? "184px" : "116px";
                this.dateTimeList.store.reset(this.FormatType===AscPDF.FormatType.DATE ? this.dateFormats : this.timeFormats);
                this.dateTimeList.selectRecord(this.dateTimeList.store.at(this.FormatType===AscPDF.FormatType.DATE ? 1 : 0));
                this.dateTimeList.scrollToRecord(this.dateTimeList.store.at(0));
                this.inputCustomFormat.setVisible(false);
            }
            this._examplePanel.toggleClass('hidden', this.FormatType===AscPDF.FormatType.SPECIAL || this.FormatType===AscPDF.FormatType.NONE || this.FormatType===AscPDF.FormatType.CUSTOM);
            this.updateFormatExample();

            
            if(!isNumeric && this.radioValidateRange.getValue()) {
                this.radioValidateNone.setValue(true);
            }
            this.radioValidateRange.setDisabled(!isNumeric);
        },

        textTitle: 'Format Settings',
        textCategory: 'Category',
        textDecimal: 'Decimal places',
        textSeparator: 'Separator style',
        textSymbol: 'Currency symbol',
        textLocation: 'Symbol location',
        textNegative: 'Negative number style',
        textParens: 'Show parentheses',
        textRed: 'Use red text',
        textFormat: 'Format',
        textReg: "Regular expression",
        textMask: "Arbitrary Mask",
        textPhone: "Phone Number",
        textZipCode: "ZIP Code",
        textZipCode4: "ZIP Code + 4",
        textSSN: "Social Security Number",
        textNumber: 'Number',
        txtCustom: 'Custom',
        textDate: 'Date',
        textTime: 'Time',
        textPercent: 'Percentage',
        textSpecial: 'Special',
        txtSample: 'Example:',
        textNone: 'None',
        textBeforeSpace: 'Before with space',
        textAfterSpace: 'After with space',
        textBefore: 'Before no space',
        textAfter: 'After no space',
        textCustom: 'Custom',
        textFormat: 'Format',
        textValidate: 'Validate',
        textCalculate: 'Calculate',
        textCustomFormatScript: 'Custom format script',
        textCustomKeystrokeScript: 'Custom keystroke script',
        textValidateNone: 'Field value is not validated',
        textValidateRange: 'Field value is in range',
        textValidateScript: 'Run custom validation script',
        textFrom: 'From',
        textTo: 'To',
        textCalculateNone: 'Value is not calculated',
        textCalculateOperation: 'Value from fields',
        textOperation: 'Operation',
        textFields: 'Fields',
        textPick: 'Pick',
        textCalculateScript: 'Custom calculation script',
        textSum: 'sum',
        textProduct: 'product',
        textAverage: 'average',
        textMinimum: 'minimum',
        textMaximum: 'maximum'

    }, PDFE.Views.FormSettingsAdvanced || {}))
});