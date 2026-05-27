
/**
 *  CheckBoxSettingsDialog.js
 *
 */
define([
    'common/main/lib/view/AdvancedSettingsWindow'
], function () { 'use strict';

    // Matches CFormControlPr_checked_* constants in Controls.js
    var CHECKED_UNCHECKED = 0;
    var CHECKED_CHECKED   = 1;
    var CHECKED_MIXED     = 2;

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
                                        '<label class="input-label" style="font-weight: bold;">' + me.textValue + '</label>',
                                    '</td>',
                                '</tr>',
                                '<tr>',
                                    '<td class="padding-small">',
                                        '<div id="checkbox-settings-unchecked" class="input-row"></div>',
                                    '</td>',
                                '</tr>',
                                '<tr>',
                                    '<td class="padding-small">',
                                        '<div id="checkbox-settings-checked" class="input-row"></div>',
                                    '</td>',
                                '</tr>',
                                '<tr>',
                                    '<td class="padding-small">',
                                        '<div id="checkbox-settings-mixed" class="input-row"></div>',
                                    '</td>',
                                '</tr>',
                                '<tr>',
                                    '<td style="padding-top: 10px;">',
                                        '<label class="input-label" style="font-weight: bold;">' + me.textCellLink + '</label>',
                                    '</td>',
                                '</tr>',
                                '<tr>',
                                    '<td class="padding-small">',
                                        '<div id="checkbox-settings-cell-link" class="input-row"></div>',
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

            this.radioUnchecked = new Common.UI.RadioBox({
                el      : $('#checkbox-settings-unchecked'),
                labelText: me.textUnchecked,
                name    : 'asc-checkbox-value',
                value   : CHECKED_UNCHECKED
            });

            this.radioChecked = new Common.UI.RadioBox({
                el      : $('#checkbox-settings-checked'),
                labelText: me.textChecked,
                name    : 'asc-checkbox-value',
                value   : CHECKED_CHECKED
            });

            this.radioMixed = new Common.UI.RadioBox({
                el      : $('#checkbox-settings-mixed'),
                labelText: me.textMixed,
                name    : 'asc-checkbox-value',
                value   : CHECKED_MIXED
            });

            this.txtCellLink = new Common.UI.InputFieldBtn({
                el          : $('#checkbox-settings-cell-link'),
                name        : 'range',
                style       : 'width: 100%;',
                btnHint     : this.textSelectData,
                validateOnBlur: false,
                hideErrorOnInput: true,
                validator   : function (value) {
                    if (!value || value.trim() === '') return true;
                    var result = me.api.asc_checkDataRange(Asc.c_oAscSelectionDialogType.CheckBox, value, true);
                    return result === Asc.c_oAscError.ID.No || me.textInvalidRef;
                }
            });
            this.txtCellLink.on('button:click', _.bind(this.onSelectCellLink, this));

            this.afterRender();
        },

        afterRender: function () {
            this._setDefaults(this.props);
        },

        getFocusedComponents: function () {
            return [this.radioUnchecked, this.radioChecked, this.radioMixed, this.txtCellLink].concat(this.getFooterButtons());
        },

        getDefaultFocusableComponent: function () {
            if (this._alreadyRendered) return;
            this._alreadyRendered = true;
            return this.txtCellLink;
        },

        _setDefaults: function (props) {
            if (!props) return;
            var checked = props.checked || CHECKED_UNCHECKED;
            if (checked === CHECKED_CHECKED) {
                this.radioChecked.setValue(true, true);
            } else if (checked === CHECKED_MIXED) {
                this.radioMixed.setValue(true, true);
            } else {
                this.radioUnchecked.setValue(true, true);
            }
            this.txtCellLink.setValue(props.fmlaLink || '');
        },

        getSettings: function () {
            var checked = CHECKED_UNCHECKED;
            if (this.radioChecked.getValue()) {
                checked = CHECKED_CHECKED;
            } else if (this.radioMixed.getValue()) {
                checked = CHECKED_MIXED;
            }
            return {
                checked  : checked,
                fmlaLink : this.txtCellLink.getValue()
            };
        },

        onSelectCellLink: function () {
            var me = this;
            if (me.api) {
                var win = new SSE.Views.CellRangeDialog({
                    handler: function (dlg, result) {
                        if (result === 'ok') {
                            me.txtCellLink.setValue(dlg.getSettings());
                            me.txtCellLink.checkValidate();
                        }
                    }
                }).on('close', function () {
                    me.show();
                    _.delay(function () {
                        me.txtCellLink.focus();
                    }, 1);
                });
                var xy = Common.Utils.getOffset(me.$window);
                me.hide();
                win.show(me.$window, xy);
                win.setSettings({
                    api     : me.api,
                    range   : me.txtCellLink.getValue(),
                    type    : Asc.c_oAscSelectionDialogType.CheckBox
                });
            }
        },

        textTitle     : 'Format Control',
        textValue     : 'Value',
        textUnchecked : 'Unchecked',
        textChecked   : 'Checked',
        textMixed     : 'Mixed',
        textCellLink  : 'Cell link',
        textSelectData: 'Select data',
        textInvalidRef: 'ERROR! Invalid cell reference'
    }, SSE.Views.CheckBoxSettingsDialog || {}));
});
