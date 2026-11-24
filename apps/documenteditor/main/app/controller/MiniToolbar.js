/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
define([
    'core',
    'documenteditor/main/app/view/MiniToolbar'
], function () {
    'use strict';

    // Mini toolbar, like the mini toolbar in Word: after text is selected with the
    // mouse, a small bar with font, size, bold/italic/underline, colours and clear formatting appears just above (or
    // below) the selection. It is half transparent until the mouse comes near and goes away when the mouse moves far
    // away, on a key press, scrolling, a click elsewhere, Escape, or when a dialog or another menu opens.
    // Every command goes through the Toolbar controller (the Home tab handlers), so undo, track changes and locks work
    // as there. Switched off in File > Advanced settings ("de-settings-mini-toolbar", on by default).
    DE.Controllers.MiniToolbar = Backbone.Controller.extend(_.extend({
        models: [],
        collections: [],
        views: [
            'MiniToolbar'
        ],

        settingKey: 'de-settings-mini-toolbar',
        hideDistance: 150,  // px from the bar: further away the bar disappears
        gap: 8,             // px between the selected text and the bar

        initialize: function() {
            this._state = {};
            this._visible = false;
        },

        onLaunch: function() {
            this.view = this.createView('MiniToolbar');
        },

        setApi: function(api) {
            this.api = api;
            if (api) {
                var me = this;
                api.asc_registerCallback('asc_onFocusObject',    _.bind(this.onApiFocusObject, this));
                api.asc_registerCallback('asc_onFontSize',       _.bind(this.onApiFontSize, this));
                api.asc_registerCallback('asc_onBold',           _.bind(this.onApiToggle, this, 'btnBold'));
                api.asc_registerCallback('asc_onItalic',         _.bind(this.onApiToggle, this, 'btnItalic'));
                api.asc_registerCallback('asc_onUnderline',      _.bind(this.onApiToggle, this, 'btnUnderline'));
                api.asc_registerCallback('asc_onTextColor',      _.bind(this.onApiTextColor, this));
                api.asc_registerCallback('asc_onTextHighLight',  _.bind(this.onApiHighlightColor, this));
                api.asc_registerCallback('asc_onZoomChange',     _.bind(this.hide, this));
                api.asc_registerCallback('asc_onCoAuthoringDisconnect', _.bind(this.hide, this));
                api.asc_registerCallback('asc_onSendThemeColors', function() {
                    _.defer(function() { me.updateThemeColors(); });   // after Main has read the new theme colours
                });
                Common.NotificationCenter.on('fonts:change', _.bind(this.onApiChangeFont, this));
            }
            return this;
        },

        setMode: function(mode) {
            this.mode = mode;
            if (mode && mode.isEdit && !this._listening) {
                this._listening = true;
                // pointer events: the editor calls preventDefault on pointerdown in the document, so the browser
                // sends no mousedown/mouseup there (and none while the button is held)
                var down = window.PointerEvent ? 'pointerdown' : 'mousedown',
                    up = window.PointerEvent ? 'pointerup' : 'mouseup',
                    move = window.PointerEvent ? 'pointermove' : 'mousemove';
                document.addEventListener(down, _.bind(this.onDocMouseDown, this), true);
                document.addEventListener(up, _.bind(this.onDocMouseUp, this), true);
                document.addEventListener(move, _.bind(this.onDocMouseMove, this), true);
                document.addEventListener('keydown', _.bind(this.onDocKeyDown, this), true);
                document.addEventListener('wheel', _.bind(this.onDocWheel, this), {capture: true, passive: true});
                $(window).on('resize', _.bind(this.hide, this));
                Common.NotificationCenter.on('modal:show', _.bind(this.hide, this));
                Common.NotificationCenter.on('layout:changed', _.bind(this.hide, this));
                Common.NotificationCenter.on('menu:show', _.bind(this.onOtherMenuShow, this));
            }
            return this;
        },

        isEnabled: function() {
            return Common.localStorage.getBool(this.settingKey, true);
        },

        // ---- rules (plain functions, tested in test/unit-tests/documenteditor) ----

        // ctx: what is true just after the mouse button was released in the document
        canShow: function(ctx) {
            return !!(ctx && ctx.enabled && ctx.isEdit && !ctx.isRestrictedEdit && !ctx.modal && !ctx.toolbarDisabled &&
                      !ctx.markerMode && !ctx.paintFormat && ctx.hasSelection && !ctx.inObject);
        },

        // pressing a key (typing, arrows, Delete, shortcuts) hides the bar; Shift, Ctrl, Alt or Meta alone do not
        isHidingKey: function(e) {
            var k = e.keyCode;
            return !(k === 16 || k === 17 || k === 18 || k === 91 || k === 92 || k === 93 || k === 224 ||
                     e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'AltGraph');
        },

        distanceToRect: function(x, y, rect) {
            var dx = Math.max(rect.left - x, 0, x - (rect.left + rect.width)),
                dy = Math.max(rect.top - y, 0, y - (rect.top + rect.height));
            return Math.sqrt(dx * dx + dy * dy);
        },

        // fully opaque with the mouse over the bar, half transparent near it, fainter further away, null = hide
        getOpacity: function(distance) {
            if (distance <= 0) return 1;
            if (distance > this.hideDistance) return null;
            return Math.round((0.75 - 0.5 * distance / this.hideDistance) * 100) / 100;
        },

        // o.bounds: selection corners from asc_GetSelectionBounds, already in the coordinates of the area:
        //   [start top, start bottom, end top, end bottom], each [x, y]
        // o.mouse: {x, y} where the mouse button was released, o.size: {width, height} of the bar,
        // o.area: {width, height} of the editor area. Returns {left, top}.
        // The bar goes above the first line when the mouse is on the first line (or the selection has one line),
        // otherwise below the last line, so that it does not cover the selected text. If there is no room there,
        // it goes to the other side; if that would be far from the mouse, it goes next to the mouse instead.
        calcPosition: function(o) {
            var b = o.bounds, w = o.size.width, h = o.size.height,
                areaW = o.area.width, areaH = o.area.height, gap = this.gap,
                mouse = o.mouse,
                top0 = Math.min(b[0][1], b[2][1]),
                bottom = Math.max(b[1][1], b[3][1]),
                oneLine = Math.abs(b[0][1] - b[2][1]) < 1,
                atStart = !oneLine && !!mouse &&
                    Math.abs(mouse.y - (b[0][1] + b[1][1]) / 2) < Math.abs(mouse.y - (b[2][1] + b[3][1]) / 2),
                x = mouse ? mouse.x : (atStart ? b[0][0] : b[2][0]),
                left = Math.max(0, Math.min(x - w / 2, areaW - w)),
                above = top0 - gap - h,
                below = bottom + gap,
                order = (oneLine || atStart) ? [above, below] : [below, above],
                fits = function(t) { return t >= 0 && t + h <= areaH; },
                me = this,
                near = function(t) {
                    return !mouse || me.distanceToRect(mouse.x, mouse.y, {left: left, top: t, width: w, height: h}) < me.hideDistance * 0.6;
                },
                top = _.find(order, function(t) { return fits(t) && near(t); });

            if (top === undefined) {
                // a tall selection or one at the edge: next to the mouse, above it if there is room
                var y = mouse ? mouse.y : (atStart ? b[0][1] : b[3][1]);
                top = (y - gap * 2 - h >= 0) ? y - gap * 2 - h : y + gap * 2;
            }
            top = Math.max(0, Math.min(top, areaH - h));
            return {left: Math.round(left), top: Math.round(top)};
        },

        // ---- show / hide ----

        getToolbar: function() {
            var ctrl = this.getApplication().getController('Toolbar');
            return {ctrl: ctrl, view: ctrl ? ctrl.getView('Toolbar') : null};
        },

        getEditorArea: function() {
            return $('#editor_sdk');
        },

        inDocument: function(target) {
            return !!target && $(target).closest('#id_main_view').length > 0;
        },

        inBar: function(target) {
            return !!(this.view && this.view.rendered && target && $.contains(this.view.el, target));
        },

        collectContext: function() {
            var api = this.api,
                tb = this.getToolbar().view,
                ctx = {
                    enabled: this.isEnabled(),
                    isEdit: !!(this.mode && this.mode.isEdit),
                    isRestrictedEdit: !!(this.mode && this.mode.isRestrictedEdit),
                    modal: Common.Utils.ModalWindow.isVisible(),
                    toolbarDisabled: !tb || !tb.btnBold || tb.btnBold.isDisabled() || !tb.cmbFontName || tb.cmbFontName.isDisabled(),
                    markerMode: !!(api && api.isMarkerFormat) || !!(tb && tb.btnHighlightColor && tb.btnHighlightColor.pressed),
                    paintFormat: !!(tb && tb.btnCopyStyle && tb.btnCopyStyle.pressed),
                    hasSelection: false,
                    inObject: false
                };
            if (ctx.enabled && ctx.isEdit && api) {
                ctx.hasSelection = !!(api.can_CopyCut && api.can_CopyCut());
                // pictures, charts, shapes and text boxes (also text inside them) and equations have their own bars
                _.each(api.getSelectedElements ? api.getSelectedElements() : [], function(el) {
                    var type = el.get_ObjectType();
                    if (type === Asc.c_oAscTypeSelectElement.Image || type === Asc.c_oAscTypeSelectElement.Math)
                        ctx.inObject = true;
                });
            }
            return ctx;
        },

        tryShow: function(mouse) {
            if (!this.api || !this.canShow(this.collectContext())) return;

            var $area = this.getEditorArea();
            if (!$area.length) return;
            this.createBar($area);
            if (!this.view.rendered) return;

            this.syncState();
            this.syncDisabled();

            var $el = this.view.$el,
                areaOffset = $area.offset(),
                $main = $('#id_main_view'),
                mainOffset = $main.length ? $main.offset() : areaOffset,
                dx = mainOffset.left - areaOffset.left,
                dy = mainOffset.top - areaOffset.top,
                bounds = _.map(this.api.asc_GetSelectionBounds(), function(p) { return [p[0] + dx, p[1] + dy]; }),
                m = mouse ? {x: mouse.pageX - areaOffset.left, y: mouse.pageY - areaOffset.top} : null;

            $el.css({visibility: 'hidden', display: 'block', left: 0, top: 0});
            var pos = this.calcPosition({
                bounds: bounds,
                mouse: m,
                size: {width: $el.outerWidth(), height: $el.outerHeight()},
                area: {width: $area.width(), height: $area.height()}
            });
            $el.css({left: pos.left, top: pos.top, visibility: ''});
            this._rect = {left: pos.left + areaOffset.left, top: pos.top + areaOffset.top, width: $el.outerWidth(), height: $el.outerHeight()};
            this._visible = true;

            // the colour and font lists open upwards when there is more room above the bar
            var diffDown = $area.height() - pos.top - this._rect.height,
                menuAlign = (diffDown < 220 && diffDown < pos.top * 0.9) ? 'bl-tl' : 'tl-bl';
            if (Common.UI.isRTL()) menuAlign = (menuAlign === 'bl-tl') ? 'br-tr' : 'tr-br';
            this.view.btnFontColor.menu.menuAlign = this.view.btnHighlightColor.menu.menuAlign = menuAlign;

            this.setOpacity(m ? this.getOpacity(this.distanceToRect(m.x + areaOffset.left, m.y + areaOffset.top, this._rect)) : 0.75);
        },

        hide: function() {
            if (!this._visible) return;
            this._visible = false;
            if (this.view && this.view.rendered) {
                this.view.closeMenus();
                this.view.$el.hide();
                if ($.contains(this.view.el, document.activeElement))
                    Common.NotificationCenter.trigger('edit:complete', this.view);
            }
        },

        isVisible: function() {
            return this._visible;
        },

        setOpacity: function(value) {
            if (value === null) {
                this.hide();
                return;
            }
            this.view.$el.css('opacity', value);
            this.view.$el.toggleClass('over', value >= 1);
        },

        // ---- DOM events ----

        onDocMouseDown: function(e) {
            this._mouseDownInDoc = (e.button === 0) && e.pointerType !== 'touch' && this.inDocument(e.target);
            clearTimeout(this._showTimer);
            if (this._visible && !this.inBar(e.target))
                this.hide();
        },

        onDocMouseUp: function(e) {
            if (!this._mouseDownInDoc) return;
            this._mouseDownInDoc = false;
            if (e.button !== 0) return;
            var me = this,
                mouse = {pageX: e.pageX, pageY: e.pageY};
            // after the editor has finished the selection
            clearTimeout(this._showTimer);
            this._showTimer = setTimeout(function() { me.tryShow(mouse); }, 50);
        },

        onDocMouseMove: function(e) {
            if (!this._visible || !this._rect || e.buttons) return;
            if (this.view.isBusy()) {
                this.setOpacity(1);
                return;
            }
            this.setOpacity(this.getOpacity(this.distanceToRect(e.pageX, e.pageY, this._rect)));
        },

        onDocKeyDown: function(e) {
            if (!this._visible) return;
            if (this.inBar(e.target)) {
                // Escape in the bar: close the bar when no list is open (an open list closes first)
                if (e.keyCode === Common.UI.Keys.ESC && !this.anyMenuOpen())
                    this.hide();
                return;
            }
            if (this.isHidingKey(e))
                this.hide();
        },

        onDocWheel: function(e) {
            if (this._visible && !this.inBar(e.target))
                this.hide();
        },

        anyMenuOpen: function() {
            return !!(this.view && this.view.rendered && _.some(this.view.controls, function(cmp) {
                return cmp.isMenuOpen && cmp.isMenuOpen();
            }));
        },

        // a menu was opened: the context menu, a toolbar menu ... - not one of the bar
        onOtherMenuShow: function() {
            if (!this._visible) return;
            var me = this;
            _.defer(function() {
                if (me._visible && !me.anyMenuOpen())
                    me.hide();
            });
        },

        // ---- the bar ----

        createBar: function($area) {
            if (this.view.rendered) return;
            var tb = this.getToolbar(),
                ctrl = tb.ctrl,
                view = tb.view;
            if (!ctrl || !view) return;

            this.view.render($area, view);
            var bar = this.view,
                me = this;

            // the font list of the Home tab, with its recently used fonts
            // (without the recent fonts of the Home tab list: the bar list adds them itself)
            if (view.cmbFontName && view.cmbFontName.store && view.cmbFontName.store.length > 0) {
                var fonts = new Common.Collections.Fonts();
                fonts.add(_.filter(view.cmbFontName.store.toJSON(), function(font) { return !font.cloneid; }));
                bar.cmbFontName.fillFonts(fonts);
            }

            // the Home tab handlers: the same api calls, undo steps, track changes and checks
            bar.cmbFontName.on('selected', function(combo, record) {
                ctrl.onFontNameSelect(combo, record);
                // keep the recently used fonts of the Home tab list the same
                var rec = view.cmbFontName.store.findWhere({name: record.name});
                rec && view.cmbFontName.addItemToRecent && view.cmbFontName.addItemToRecent(rec);
            });
            view.cmbFontName.on('selected', function(combo, record) {
                if (!bar.cmbFontName.store) return;
                var rec = bar.cmbFontName.store.findWhere({name: record.name});
                rec && bar.cmbFontName.addItemToRecent(rec);
            });
            bar.cmbFontName.on('show:after', _.bind(ctrl.onComboOpen, ctrl, true));
            bar.cmbFontName.on('hide:after', _.bind(ctrl.onHideMenus, ctrl));
            bar.cmbFontName.on('combo:blur', _.bind(ctrl.onComboBlur, ctrl));
            bar.cmbFontName.on('combo:focusin', _.bind(ctrl.onComboOpen, ctrl, false));
            bar.cmbFontSize.on('selected', _.bind(ctrl.onFontSizeSelect, ctrl));
            bar.cmbFontSize.on('changed:before', _.bind(ctrl.onFontSizeChanged, ctrl, true));
            bar.cmbFontSize.on('changed:after', _.bind(ctrl.onFontSizeChanged, ctrl, false));
            bar.cmbFontSize.on('combo:blur', _.bind(ctrl.onComboBlur, ctrl));
            bar.cmbFontSize.on('combo:focusin', _.bind(ctrl.onComboOpen, ctrl, false));
            bar.cmbFontSize.on('show:after', _.bind(ctrl.onComboOpen, ctrl, true));
            bar.cmbFontSize.on('hide:after', _.bind(ctrl.onHideMenus, ctrl));
            bar.btnIncFontSize.on('click', _.bind(ctrl.onIncrease, ctrl));
            bar.btnDecFontSize.on('click', _.bind(ctrl.onDecrease, ctrl));
            bar.btnBold.on('click', _.bind(ctrl.onBold, ctrl));
            bar.btnItalic.on('click', _.bind(ctrl.onItalic, ctrl));
            bar.btnUnderline.on('click', _.bind(ctrl.onUnderline, ctrl));
            bar.btnClearStyle.on('click', _.bind(ctrl.onClearStyleClick, ctrl));

            bar.btnFontColor.on('click', _.bind(this.onBtnFontColor, this));
            bar.btnFontColor.on('color:select', _.bind(this.onSelectFontColor, this));
            bar.btnFontColor.on('auto:select', _.bind(this.onAutoFontColor, this));
            bar.btnHighlightColor.on('click', _.bind(this.onBtnHighlightColor, this));
            bar.mnuHighlightColorPicker.on('select', _.bind(this.onSelectHighlightColor, this));
            bar.mnuHighlightTransparent.on('click', _.bind(this.onHighlightTransparentClick, this));

            this.updateThemeColors();
            bar.$el.on('mouseenter', function() { me._visible && me.setOpacity(1); });
        },

        syncDisabled: function() {
            var tb = this.getToolbar().view,
                bar = this.view,
                pairs = [['cmbFontName', 'cmbFontName'], ['cmbFontSize', 'cmbFontSize'], ['btnIncFontSize', 'btnIncFontSize'],
                         ['btnDecFontSize', 'btnDecFontSize'], ['btnBold', 'btnBold'], ['btnItalic', 'btnItalic'],
                         ['btnUnderline', 'btnUnderline'], ['btnFontColor', 'btnFontColor'],
                         ['btnHighlightColor', 'btnHighlightColor'], ['btnClearStyle', 'btnClearStyle']];
            _.each(pairs, function(p) {
                tb[p[1]] && bar[p[0]].setDisabled(tb[p[1]].isDisabled());
            });
            $('input, button', bar.$el).attr('tabindex', '-1');
        },

        // the current values of the selection: font, size, bold/italic/underline, colours; empty when mixed
        syncState: function() {
            var props = this.api.get_TextProps(),
                textPr = props ? props.get_TextPr() : null,
                bar = this.view,
                tb = this.getToolbar().view;
            if (!textPr) return;

            var font = textPr.get_FontFamily();
            this.setFontName(font ? font.get_Name() : '');
            this._state.fontsize = undefined;
            this.setFontSize(textPr.get_FontSize());
            bar.btnBold.toggle(textPr.get_Bold() === true, true);
            bar.btnItalic.toggle(textPr.get_Italic() === true, true);
            bar.btnUnderline.toggle(textPr.get_Underline() === true, true);

            // the colour the button puts on is shared with the Home tab (the colour used last)
            if (tb && tb.btnFontColor && tb.btnFontColor.currentColor !== undefined) {
                var clr = tb.btnFontColor.currentColor;
                bar.btnFontColor.currentColor = clr;
                bar.btnFontColor.setColor((typeof(clr) == 'object') ? (clr.isAuto ? '000' : clr.color) : clr);
                bar.mnuFontColorPicker.currentColor = tb.mnuFontColorPicker ? tb.mnuFontColorPicker.currentColor : clr;
            }
            this._state.clrtext = undefined;
            var color = this._state.clrtext_asccolor;
            if (textPr.get_Color() === null) {   // several colours
                bar.mnuFontColorPicker.clearSelection();
                bar.btnFontColor.setAutoColor(false);
                this._state.clrtext = 'mixed';
            } else if (color)
                this.onApiTextColor(color);

            if (tb && tb.btnHighlightColor && tb.btnHighlightColor.currentColor) {
                bar.btnHighlightColor.currentColor = tb.btnHighlightColor.currentColor;
                bar.btnHighlightColor.setColor(bar.btnHighlightColor.currentColor);
            }
            this.showHighlight(textPr.get_HighLight());
        },

        setFontName: function(name) {
            var cmb = this.view.cmbFontName;
            if (cmb.inFormControl) return;
            cmb.onApiChangeFontInternal(name || '');
            !name && cmb.setRawValue('');
        },

        onApiChangeFont: function(font) {
            if (!this._visible || !this.view.rendered) return;
            this.setFontName(_.isFunction(font.get_Name) ? font.get_Name() : font.asc_getFontName());
        },

        onApiFontSize: function(size) {
            this._visible && this.setFontSize(size);
        },

        setFontSize: function(size) {
            if (!this.view || !this.view.rendered) return;
            if (this._state.fontsize !== size) {
                this.view.cmbFontSize.setValue((size === null || size === undefined) ? '' : size);
                this._state.fontsize = size;
            }
        },

        onApiToggle: function(name, on) {
            if (!this._visible || !this.view.rendered) return;
            this.view[name].toggle(on === true, true);
        },

        onApiFocusObject: function() {
            if (!this._visible) return;
            var me = this;
            _.defer(function() {
                // the selection was removed or became a picture/shape: no more bar
                if (me._visible && !me.view.isBusy()) {
                    var ctx = me.collectContext();
                    (!ctx.hasSelection || ctx.inObject || ctx.toolbarDisabled) && me.hide();
                }
            });
        },

        // ---- colours (as in the Toolbar controller, for the colour buttons of the bar) ----

        onApiTextColor: function(color) {
            this._state.clrtext_asccolor = color;
            if (!this.view || !this.view.rendered || !color) return;
            var bar = this.view,
                picker = bar.mnuFontColorPicker;
            if (color.get_auto()) {
                if (this._state.clrtext !== 'auto') {
                    bar.btnFontColor.setAutoColor(true);
                    picker.clearSelection();
                    this._state.clrtext = 'auto';
                }
            } else {
                var clr = (color.get_type() == Asc.c_oAscColor.COLOR_TYPE_SCHEME) ?
                        {color: Common.Utils.ThemeColor.getHexColor(color.get_r(), color.get_g(), color.get_b()), effectValue: color.get_value()} :
                        Common.Utils.ThemeColor.getHexColor(color.get_r(), color.get_g(), color.get_b()),
                    old = this._state.clrtext;
                if (old === undefined || old === 'auto' || old === 'mixed' || typeof(clr) !== typeof(old) ||
                    (typeof(clr) == 'object' && (clr.effectValue !== old.effectValue || old.color.indexOf(clr.color) < 0)) ||
                    (typeof(clr) != 'object' && old.indexOf(clr) < 0)) {
                    bar.btnFontColor.setAutoColor(false);
                    Common.Utils.ThemeColor.selectPickerColorByEffect(clr, picker);
                    this._state.clrtext = clr;
                }
            }
        },

        onSelectFontColor: function(btn, color) {
            var bar = this.view,
                tb = this.getToolbar().view;
            this._state.clrtext = undefined;
            bar.btnFontColor.currentColor = color;
            bar.btnFontColor.setColor((typeof(color) == 'object') ? (color.isAuto ? '000' : color.color) : color);
            bar.mnuFontColorPicker.currentColor = color;
            // the Home tab button puts on the same colour next time
            if (tb && tb.btnFontColor) {
                tb.btnFontColor.currentColor = color;
                tb.btnFontColor.setColor(bar.btnFontColor.color);
                tb.mnuFontColorPicker && (tb.mnuFontColorPicker.currentColor = color);
            }
            if (this.api)
                this.api.put_TextColor(color.isAuto ? color.color : Common.Utils.ThemeColor.getRgbColor(color));
            Common.NotificationCenter.trigger('edit:complete', bar);
        },

        onBtnFontColor: function() {
            var picker = this.view.mnuFontColorPicker;
            picker.trigger('select', picker, picker.currentColor || this.view.btnFontColor.currentColor);
        },

        onAutoFontColor: function() {
            var color = new Asc.asc_CColor(),
                bar = this.view;
            color.put_auto(true);
            this._state.clrtext = undefined;
            this.api && this.api.put_TextColor(color);
            bar.btnFontColor.currentColor = {color: color, isAuto: true};
            bar.mnuFontColorPicker.currentColor = {color: color, isAuto: true};
            Common.NotificationCenter.trigger('edit:complete', bar);
        },

        // the highlight of the selection is marked in the menu: a colour, "No fill" or nothing when mixed
        showHighlight: function(c) {
            if (!this.view || !this.view.rendered) return;
            var bar = this.view;
            if (c == -1) {
                bar.mnuHighlightTransparent.setChecked(true, true);
                bar.mnuHighlightColorPicker.clearSelection();
            } else if (c && c.get_hex) {
                var hex = c.get_hex().toUpperCase();
                bar.mnuHighlightTransparent.setChecked(false, true);
                if (_.contains(bar.mnuHighlightColorPicker.colors, hex))
                    bar.mnuHighlightColorPicker.selectByRGB(hex, true);
                else
                    bar.mnuHighlightColorPicker.clearSelection();
            } else {
                bar.mnuHighlightTransparent.setChecked(false, true);
                bar.mnuHighlightColorPicker.clearSelection();
            }
        },

        onApiHighlightColor: function() {
            if (!this._visible || !this.api) return;
            var props = this.api.get_TextProps(),
                textPr = props ? props.get_TextPr() : null;
            textPr && this.showHighlight(textPr.get_HighLight());
        },

        // Word-like: the highlight is put on the selected text once. The Home tab button instead switches on the
        // highlighter pen, which would also colour the next text selected with the mouse.
        applyHighlight: function(strcolor) {
            if (!this.api) return;
            strcolor = strcolor || 'transparent';
            if (strcolor == 'transparent')
                this.api.SetMarkerFormat(true, false);
            else
                this.api.SetMarkerFormat(true, true, parseInt(strcolor.substr(0, 2), 16), parseInt(strcolor.substr(2, 2), 16), parseInt(strcolor.substr(4, 2), 16));
            this.api.SetMarkerFormat(false);
            Common.NotificationCenter.trigger('edit:complete', this.view);
            Common.component.Analytics.trackEvent('ToolBar', 'Highlight Color');
        },

        onBtnHighlightColor: function(btn) {
            this.applyHighlight(btn.currentColor);
        },

        onSelectHighlightColor: function(picker, color) {
            var bar = this.view,
                tb = this.getToolbar().view;
            bar.btnHighlightColor.currentColor = color;
            bar.btnHighlightColor.setColor(color);
            if (tb && tb.btnHighlightColor) {
                tb.btnHighlightColor.currentColor = color;
                tb.btnHighlightColor.setColor(color);
            }
            this.applyHighlight(color);
        },

        onHighlightTransparentClick: function() {
            this.applyHighlight('transparent');
        },

        updateThemeColors: function() {
            if (!this.view || !this.view.rendered) return;
            var picker = this.view.mnuFontColorPicker,
                effectcolors = Common.Utils.ThemeColor.getEffectColors();
            if (!picker || !effectcolors) return;
            var clr;
            for (var i = 0; i < effectcolors.length; i++) {
                if (typeof(picker.currentColor) == 'object' && clr === undefined && picker.currentColor.effectId == effectcolors[i].effectId)
                    clr = effectcolors[i];
            }
            picker.updateColors(effectcolors, Common.Utils.ThemeColor.getStandartColors());
            if (picker.currentColor === undefined)
                picker.currentColor = effectcolors[1];
            else if (clr !== undefined)
                picker.currentColor = clr;
            this._state.clrtext = undefined;
        }

    }, DE.Controllers.MiniToolbar || {}));
});
