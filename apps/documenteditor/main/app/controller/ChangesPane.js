/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
define([
    'core',
    'documenteditor/main/app/view/ChangesPane'
], function () {
    'use strict';

    // List of tracked changes in the left panel: every change with author, date and text in document order, a filter
    // by author, click to go to the change, accept or reject one change or all changes shown. The marks in the document
    // itself stay as they are.
    DE.Controllers.ChangesPane = Backbone.Controller.extend(_.extend({
        models: [],
        collections: [],
        views: [
            'ChangesPane'
        ],

        initialize: function() {
            var me = this;
            this._author = '';
            this.addListeners({
                'ChangesPane': {
                    'show': function() {
                        me.updateList(true);
                        me.startWatch();
                    },
                    'hide': function() {
                        me.stopWatch();
                    }
                }
            });
        },

        onLaunch: function() {
            this.panel = this.createView('ChangesPane');
            this.panel.on('render:after', _.bind(this.onAfterRender, this));
        },

        setApi: function(api) {
            this.api = api;
            return this;
        },

        onAfterRender: function(panel) {
            var me = this;
            panel.changesList.on('item:click', _.bind(this.onItemClick, this));
            panel.cmbAuthor.on('selected', function(combo, record) {
                me._author = record.value;
                me.updateList(true);
            });
            panel.btnAcceptAll.on('click', _.bind(this.onAllShown, this, true));
            panel.btnRejectAll.on('click', _.bind(this.onAllShown, this, false));
        },

        isPanelVisible: function() {
            return this.panel && this.panel.rendered && this.panel.isVisible();
        },

        // the document has no event for "tracked changes changed", so the list is checked while it is open and only
        // drawn again when something is different
        startWatch: function() {
            var me = this;
            this.stopWatch();
            this._watch = setInterval(function() {
                me.isPanelVisible() ? me.updateList(false) : me.stopWatch();
            }, 1500);
        },

        stopWatch: function() {
            this._watch && clearInterval(this._watch);
            this._watch = null;
        },

        getChanges: function() {
            return this.api && this.api.asc_GetRevisionChangesInOrder ? this.api.asc_GetRevisionChangesInOrder() : [];
        },

        updateList: function(force) {
            if (!this.api || !this.isPanelVisible())
                return;

            var me = this,
                panel = this.panel,
                changes = this.getChanges();

            // a cheap fingerprint of the list: no redraw (and no lost scroll position) while nothing changed
            var signature = this._author + '|' + _.map(changes, function(c) {
                return c.get_UserName() + ':' + c.get_Type() + ':' + c.get_DateTime() + ':' + JSON.stringify(c.get_Value());
            }).join('|');
            if (!force && signature === this._signature)
                return;
            this._signature = signature;

            // authors for the filter, with the number of their changes
            var authors = {};
            _.each(changes, function(c) {
                var name = c.get_UserName();
                authors[name] = (authors[name] || 0) + 1;
            });
            var names = _.keys(authors).sort(function(a, b) { return a.localeCompare(b); });
            if (this._author && !authors[this._author])
                this._author = '';
            panel.cmbAuthor.setData([{value: '', displayValue: panel.txtAllAuthors + ' (' + changes.length + ')'}].concat(_.map(names, function(name) {
                return {value: name, displayValue: (name || '?') + ' (' + authors[name] + ')'};
            })));
            panel.cmbAuthor.setValue(this._author);

            var shown = this._author ? _.filter(changes, function(c) { return c.get_UserName() === me._author; }) : changes;
            var review = this.getApplication().getController('Common.Controllers.ReviewChanges');
            var models = review && review.readSDKChange ? review.readSDKChange(shown) : [];

            var scrollTop = panel.changesList.scroller ? panel.changesList.scroller.getScrollTop() : 0;
            this._shownCount = shown.length;
            panel.changesList.store.reset(_.map(models, function(model, index) {
                return {
                    username: model.get('username'),
                    usercolor: model.get('usercolor') || '#888',
                    date: model.get('date'),
                    changetext: model.get('changetext'),
                    editable: !!model.get('editable') && !model.get('lock'),
                    changedata: shown[index],
                    scope: panel
                };
            }));
            !force && panel.changesList.scroller && panel.changesList.scroller.scrollTop(scrollTop);

            panel.lblCount.text(this._author ? Common.Utils.String.format(panel.txtCountOf, shown.length, changes.length) :
                Common.Utils.String.format(panel.txtCount, changes.length));
            var canEdit = shown.length > 0 && _.some(models, function(model) { return model.get('editable'); });
            panel.btnAcceptAll.setDisabled(!canEdit);
            panel.btnRejectAll.setDisabled(!canEdit);
        },

        onItemClick: function(list, item, record, e) {
            if (!this.api || !record)
                return;

            var change = record.get('changedata'),
                action = e && $(e.target).closest('.changespane-action').attr('data-action');
            if (action === 'accept')
                this.api.asc_AcceptChanges(change);
            else if (action === 'reject')
                this.api.asc_RejectChanges(change);
            else
                this.api.asc_SelectRevisionChange(change);

            action && this.updateList(true);
        },

        onAllShown: function(isAccept) {
            if (!this.api)
                return;

            var me = this,
                panel = this.panel,
                count = this._shownCount || 0;
            Common.UI.confirm({
                msg: Common.Utils.String.format(isAccept ? panel.txtConfirmAll : panel.txtConfirmRejectAll, count),
                buttons: ['yes', 'no'],
                primary: 'yes',
                callback: function(btn) {
                    if (btn !== 'yes')
                        return;
                    if (me._author)
                        isAccept ? me.api.asc_AcceptRevisionChangesOfUser(me._author) : me.api.asc_RejectRevisionChangesOfUser(me._author);
                    else
                        isAccept ? me.api.asc_AcceptAllChanges() : me.api.asc_RejectAllChanges();
                    me.updateList(true);
                    Common.NotificationCenter.trigger('edit:complete', me);
                }
            });
        }

    }, DE.Controllers.ChangesPane || {}));
});
