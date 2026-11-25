/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
define([], function () {
    'use strict';

    // Mini toolbar: a small floating bar with the most used text formatting, shown
    // above a text selection made with the mouse, like the mini toolbar in Word. The controls are copies of the Home
    // tab controls (same icons, tips, font list and colour pickers); the Toolbar controller does the formatting.
    DE.Views.MiniToolbar = Common.UI.BaseView.extend(_.extend({
        template: _.template([
            '<div id="mini-toolbar" class="mini-toolbar" role="toolbar" aria-label="<%= scope.txtLabel %>" style="display: none;">',
                '<div class="mini-toolbar-row">',
                    '<div id="mini-toolbar-fontname" class="mini-toolbar-cell"></div>',
                    '<div id="mini-toolbar-fontsize" class="mini-toolbar-cell"></div>',
                    '<div id="mini-toolbar-incfont" class="mini-toolbar-cell"></div>',
                    '<div id="mini-toolbar-decfont" class="mini-toolbar-cell"></div>',
                '</div>',
                '<div class="mini-toolbar-row">',
                    '<div id="mini-toolbar-bold" class="mini-toolbar-cell"></div>',
                    '<div id="mini-toolbar-italic" class="mini-toolbar-cell"></div>',
                    '<div id="mini-toolbar-underline" class="mini-toolbar-cell"></div>',
                    '<div id="mini-toolbar-fontcolor" class="mini-toolbar-cell"></div>',
                    '<div id="mini-toolbar-highlight" class="mini-toolbar-cell"></div>',
                    '<div id="mini-toolbar-clearstyle" class="mini-toolbar-cell"></div>',
                '</div>',
            '</div>'
        ].join('')),

        initialize: function(options) {
            _.extend(this, options);
            Common.UI.BaseView.prototype.initialize.call(this, arguments);
        },

        // parentEl: the editor area (#editor_sdk); tb: the toolbar view with the Home tab controls
        render: function(parentEl, tb) {
            var me = this,
                $markup = $(this.template({scope: this})),
                hint = function(cmp, text) {
                    // the Home tab tip, with the keyboard shortcut when the toolbar has added it
                    return (cmp && cmp.options && cmp.options.hint) || text;
                };
            parentEl.append($markup);
            this.setElement($markup);
            this.controls = [];

            this.cmbFontName = new Common.UI.ComboBoxFonts({
                el: $('#mini-toolbar-fontname', $markup),
                cls: 'input-group-nr',
                style: 'width: 130px;',
                menuCls: 'scrollable-menu menu-absolute',
                menuStyle: 'min-width: 325px;max-height: 270px;',
                restoreMenuHeightAndTop: 220,
                store: new Common.Collections.Fonts(),
                hint: tb.tipFontName
            });
            this.controls.push(this.cmbFontName);

            this.cmbFontSize = new Common.UI.ComboBox({
                el: $('#mini-toolbar-fontsize', $markup),
                cls: 'input-group-nr',
                style: 'width: 45px;',
                menuCls: 'scrollable-menu menu-absolute',
                menuStyle: 'min-width: 55px;max-height: 270px;',
                restoreMenuHeightAndTop: 220,
                hint: tb.tipFontSize,
                data: tb.cmbFontSize ? tb.cmbFontSize.store.toJSON() : []
            });
            this.controls.push(this.cmbFontSize);

            this.btnIncFontSize = new Common.UI.Button({
                parentEl: $('#mini-toolbar-incfont', $markup),
                cls: 'btn-toolbar',
                iconCls: 'toolbar__icon btn-incfont',
                hint: hint(tb.btnIncFontSize, tb.tipIncFont)
            });
            this.controls.push(this.btnIncFontSize);

            this.btnDecFontSize = new Common.UI.Button({
                parentEl: $('#mini-toolbar-decfont', $markup),
                cls: 'btn-toolbar',
                iconCls: 'toolbar__icon btn-decfont',
                hint: hint(tb.btnDecFontSize, tb.tipDecFont)
            });
            this.controls.push(this.btnDecFontSize);

            this.btnBold = new Common.UI.Button({
                parentEl: $('#mini-toolbar-bold', $markup),
                cls: 'btn-toolbar',
                iconCls: 'toolbar__icon btn-bold',
                enableToggle: true,
                hint: hint(tb.btnBold, tb.textBold)
            });
            this.controls.push(this.btnBold);

            this.btnItalic = new Common.UI.Button({
                parentEl: $('#mini-toolbar-italic', $markup),
                cls: 'btn-toolbar',
                iconCls: 'toolbar__icon btn-italic',
                enableToggle: true,
                hint: hint(tb.btnItalic, tb.textItalic)
            });
            this.controls.push(this.btnItalic);

            this.btnUnderline = new Common.UI.Button({
                parentEl: $('#mini-toolbar-underline', $markup),
                cls: 'btn-toolbar',
                iconCls: 'toolbar__icon btn-underline',
                enableToggle: true,
                hint: hint(tb.btnUnderline, tb.textUnderline)
            });
            this.controls.push(this.btnUnderline);

            // the same colour menu as the Home tab text colour (theme colours, standard colours, automatic)
            this.btnFontColor = new Common.UI.ButtonColored({
                parentEl: $('#mini-toolbar-fontcolor', $markup),
                cls: 'btn-toolbar',
                iconCls: 'toolbar__icon btn-fontcolor',
                split: true,
                menu: true,
                auto: true,
                hint: hint(tb.btnFontColor, tb.tipFontColor)
            });
            this.btnFontColor.setMenu();
            this.mnuFontColorPicker = this.btnFontColor.getPicker();
            this.controls.push(this.btnFontColor);

            // the same highlight menu as the Home tab: 16 colours and "No fill"
            this.btnHighlightColor = new Common.UI.ButtonColored({
                parentEl: $('#mini-toolbar-highlight', $markup),
                cls: 'btn-toolbar',
                iconCls: 'toolbar__icon btn-highlight',
                split: true,
                menu: new Common.UI.Menu({
                    style: 'min-width: 100px;',
                    items: [
                        {template: _.template('<div id="mini-toolbar-menu-highlight" style="width: 145px; display: inline-block;" class="palette-large"></div>')},
                        {caption: '--'},
                        this.mnuHighlightTransparent = new Common.UI.MenuItem({
                            caption: tb.strMenuNoFill,
                            checkable: true
                        })
                    ]
                }),
                hint: hint(tb.btnHighlightColor, tb.tipHighlightColor)
            });
            this.btnHighlightColor.currentColor = 'FFFF00';
            this.btnHighlightColor.setColor(this.btnHighlightColor.currentColor);
            this.mnuHighlightColorPicker = new Common.UI.ThemeColorPalette({
                el: $('#mini-toolbar-menu-highlight', $markup),
                colors: [
                    'FFFF00', '00FF00', '00FFFF', 'FF00FF', '0000FF', 'FF0000', '00008B', '008B8B',
                    '006400', '800080', '8B0000', '808000', 'FFFFFF', 'D3D3D3', 'A9A9A9', '000000'
                ],
                colorHints: [
                    Common.Utils.ThemeColor.txtYellow, Common.Utils.ThemeColor.txtBrightGreen, Common.Utils.ThemeColor.txtTurquosie, Common.Utils.ThemeColor.txtPink,
                    Common.Utils.ThemeColor.txtBlue, Common.Utils.ThemeColor.txtRed, Common.Utils.ThemeColor.txtDarkBlue, Common.Utils.ThemeColor.txtTeal,
                    Common.Utils.ThemeColor.txtGreen, Common.Utils.ThemeColor.txtViolet, Common.Utils.ThemeColor.txtDarkRed, Common.Utils.ThemeColor.txtDarkYellow,
                    Common.Utils.ThemeColor.txtWhite, Common.Utils.ThemeColor.txtGray + '-25%', Common.Utils.ThemeColor.txtGray + '-50%', Common.Utils.ThemeColor.txtBlack
                ],
                value: 'FFFF00',
                dynamiccolors: 0,
                themecolors: 0,
                effects: 0,
                columns: 4,
                outerMenu: {menu: this.btnHighlightColor.menu, index: 0, focusOnShow: true}
            });
            this.btnHighlightColor.setPicker(this.mnuHighlightColorPicker);
            this.btnHighlightColor.menu.setInnerMenu([{menu: this.mnuHighlightColorPicker, index: 0}]);
            this.controls.push(this.btnHighlightColor);

            this.btnClearStyle = new Common.UI.Button({
                parentEl: $('#mini-toolbar-clearstyle', $markup),
                cls: 'btn-toolbar',
                iconCls: 'toolbar__icon btn-clearstyle',
                hint: hint(tb.btnClearStyle, tb.tipClearStyle)
            });
            this.controls.push(this.btnClearStyle);

            // the font and size lists open inside the editor area, up or down where there is room
            this.cmbFontName.options.menuAlignEl = this.cmbFontSize.options.menuAlignEl = parentEl;

            // not in the Tab order of the document: the bar is for the mouse, the Home tab is there for the keyboard
            $markup.find('input, button, a').attr('tabindex', '-1');

            var bringForward = function() { $markup.addClass('has-open-menu'); },
                sendBackward = function() { $markup.removeClass('has-open-menu'); };
            _.each([this.btnFontColor, this.btnHighlightColor], function(btn) {
                btn.menu.on('show:before', bringForward);
                btn.menu.on('hide:after', sendBackward);
            });
            _.each([this.cmbFontName, this.cmbFontSize], function(cmb) {
                cmb.on('show:before', bringForward);
                cmb.on('hide:after', sendBackward);
            });

            this.rendered = true;
            this.trigger('render:after', this);
            return this;
        },

        // a list or colour menu of the bar is open, or the font name / size is being typed
        isBusy: function() {
            if (!this.rendered) return false;
            var open = _.some(this.controls, function(cmp) {
                return cmp.isMenuOpen ? cmp.isMenuOpen() : !!(cmp.menu && cmp.menu.isVisible && cmp.menu.isVisible());
            });
            return open || $.contains(this.el, document.activeElement);
        },

        closeMenus: function() {
            if (!this.rendered) return;
            _.each(this.controls, function(cmp) {
                if (cmp.closeMenu && cmp.isMenuOpen && cmp.isMenuOpen()) cmp.closeMenu();
                else if (cmp.menu && cmp.menu.isVisible && cmp.menu.isVisible()) cmp.menu.hide();
            });
        },

        txtLabel: 'Mini toolbar'

    }, DE.Views.MiniToolbar || {}));
});
