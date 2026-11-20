/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
define([
    'core',
    'documenteditor/main/app/view/SelectionPane'
], function () {
    'use strict';

    DE.Controllers.SelectionPane = Backbone.Controller.extend(_.extend({
        models: [],
        collections: [],
        views: [
            'SelectionPane'
        ],

        initialize: function() {
            var me = this;
            this.addListeners({
                'SelectionPane': {
                    'show': function() {
                        me.updateList();
                        // take the keyboard focus, like the other side panels, so the list works with the arrow keys
                        me.panel.focusList();
                    }
                }
            });
        },

        onLaunch: function() {
            this.panel = this.createView('SelectionPane');
            this.panel.on('render:after', _.bind(this.onAfterRender, this));
        },

        setApi: function(api) {
            this.api = api;
            this.api.asc_registerCallback('asc_onFocusObject', _.bind(this.onChange, this));
            this.api.asc_registerCallback('asc_onCurrentPage', _.bind(this.onChange, this));
            return this;
        },

        onAfterRender: function(panel) {
            var me = this;
            panel.objectsList.on('item:click', _.bind(this.onSelectObject, this));
            panel.objectsList.on('item:select', function(list, view, record, fromKeyDown) {
                // the arrow keys select the object too, so the list and the page show the same object
                fromKeyDown && me.onSelectObject(list, view, record);
            });
            panel.objectsList.on('item:keydown', function(list, record, e) {
                if (e.keyCode === Common.UI.Keys.ESC)
                    Common.NotificationCenter.trigger('edit:complete', panel);
            });
            panel.orderButtons.forEach(function(button) {
                button.on('click', _.bind(me.onChangeOrder, me, button.options.level));
            });
        },

        isPanelVisible: function() {
            return this.panel && this.panel.rendered && this.panel.isVisible();
        },

        onChange: function() {
            if (!this.isPanelVisible())
                return;

            // selection and page events come in bursts, update once they settle
            var me = this;
            clearTimeout(this._updateTimer);
            this._updateTimer = setTimeout(function() {
                me.updateList();
            }, 100);
        },

        getTypeName: function(type) {
            var panel = this.panel;
            switch (type) {
                case 'image':    return panel.txtPicture;
                case 'textbox':  return panel.txtTextBox;
                case 'chart':    return panel.txtChart;
                case 'group':    return panel.txtGroup;
                case 'smartart': return panel.txtSmartArt;
                case 'shape':    return panel.txtShape;
            }
            return panel.txtObject;
        },

        updateList: function() {
            if (!this.api || !this.isPanelVisible())
                return;

            var me = this,
                panel = this.panel,
                page = this.api.getCurrentPage(),
                items = this.api.asc_GetPageDrawingObjects(page),
                counts = {},
                hadFocus = panel.listHasFocus(),
                selected = null;

            var records = _.map(items, function(item) {
                var type = me.getTypeName(item['Type']);
                counts[type] = (counts[type] || 0) + 1;

                var info = [type, item['Layer'] === 'behind' ? panel.txtBehind : (item['Layer'] === 'inline' ? panel.txtInline : panel.txtInFront)];
                item['HdrFtr'] && info.push(panel.txtHeaderFooter);

                return {
                    objectId: item['Id'],
                    name: item['Name'] || (type + ' ' + counts[type]),
                    info: info.join(' · '),
                    layer: item['Layer'],
                    isSelected: item['Selected']
                };
            });

            this._page = page;
            panel.lblPage.text(Common.Utils.String.format(panel.txtPage, page + 1));
            panel.objectsList.store.reset(records);

            selected = panel.objectsList.store.findWhere({isSelected: true});
            selected ? panel.objectsList.selectRecord(selected, true) : panel.objectsList.deselectAll(true);
            selected && panel.objectsList.scrollToRecord(selected);
            // reset redraws the rows, give the focus back so the keyboard keeps working
            hadFocus && panel.focusList();

            // inline objects move with the text and have no stacking order
            var isInline = !!selected && selected.get('layer') === 'inline';
            panel.setOrderDisabled(!selected || isInline,
                isInline ? panel.txtInlineNoOrder : (records.length > 0 ? panel.txtSelectToArrange : ''));
        },

        onSelectObject: function(list, item, record) {
            if (this.api && record) {
                this.api.asc_SelectDrawingObjectById(record.get('objectId'), this._page);
            }
        },

        onChangeOrder: function(level) {
            if (!this.api)
                return;

            var props = new Asc.asc_CImgProperty();
            props.put_ChangeLevel(level);
            this.api.ImgApply(props);
            Common.NotificationCenter.trigger('edit:complete', this);
        }

    }, DE.Controllers.SelectionPane || {}));
});
