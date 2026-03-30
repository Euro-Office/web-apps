define([ 'core'], function () {
    'use strict';

    DE.Controllers.FormsStarter = Backbone.Controller.extend({
        initialize: function () {
            this.isPDFForm = !!window.isPDFForm;
            this.init = {};
        },
        onLaunch: function () {
            this.api = this.getApplication().getController('Viewport').getApi();
            // this.api.asc_registerCallback('asc_onGetEditorPermissions', this.onEditorPermissions.bind(this));
            Common.NotificationCenter.on('app:face', this.onAppShowed.bind(this));
            Common.NotificationCenter.on('app:ready', this.onAppReady.bind(this));
            Common.NotificationCenter.on('document:ready', this.onDocumentReady.bind(this));
        },
        onEditorPermissions: function(params) {
            // this.appOptions = this.getApplication().getController('Main').appOptions;
        },

        onAppShowed: function (options) {
            this.appOptions = options;
            if (this.isPDFForm && this.appOptions.isEdit) {
                this.api.asc_setViewMode(true);
                this.api.asc_setRestriction(Asc.c_oAscRestrictionType.OnlyForms);

                const app = DE;
                const opts = {...this.appOptions};
                opts.isEdit =
                opts.isSignatureSupport =
                opts.isPasswordSupport =
                opts.showSaveButton = false;
                opts.isRestrictedEdit =
                opts.canFillForms = true;
                let view = app.getController('LeftMenu').getView('LeftMenu').menuFile;
                view.setMode(opts);

                if (options.showSaveButton) {
                    const appHeader = app.getController('Viewport').getView('Common.Views.Header');
                    appHeader.btnSave.hide();
                }

                view = app.getController('Statusbar').getView('Statusbar');
                view.$el.find('.el-edit, .el-review').hide();

                this.toolbar = app.getController('Toolbar').getView('Toolbar');
                this.toolbar.setVisible('ins', false);
                this.toolbar.setVisible('layout', false);
                this.toolbar.setVisible('links', false);
                this.toolbar.setVisible = this.setTabVisible.bind(this);
                // this.toolbar.$el.html(this.toolbar.rendererComponentsRestrictedEditForms(this.toolbar.$layout));

                if (opts.canFeatureContentControl && opts.canFeatureForms || opts.isRestrictedEdit && opts.canFillForms) {
                    if (opts.isFormCreator) {
                        const forms = app.getController('FormsTabSec');
                        forms.setConfig({toolbar: this.toolbar, config: opts});

                        const $panel = forms.createToolbarPanel();
                        if (1 && $panel) {
                            const tab = {caption: this.toolbar.textTabHome, action: 'formshome', dataHintTitle: 'M'};
                            this.toolbar.addTab(tab, $panel, 5);
                            this.toolbar.setVisible('formshome', true);
                            Array.prototype.push.apply(this.toolbar.lockControls, forms.getView('FormsTabSec').getButtons());

                            const editmode = opts.isEdit || opts.isRestrictedEdit && opts.canFillForms && opts.isFormCreator;
                            let compactview = !editmode;
                            if ( Common.localStorage.itemExists(editmode ? "de-compact-toolbar" : "de-view-compact-toolbar") ) {
                                compactview = Common.localStorage.getBool(editmode ? "de-compact-toolbar" : "de-view-compact-toolbar");
                            } else if (opts.customization) {
                                compactview = editmode ? !!config.customization.compactToolbar : config.customization.compactToolbar!==false;
                            }

                            !compactview && (opts.isFormCreator || opts.isRestrictedEdit && opts.canFillForms) &&
                                this.toolbar.setTab('formshome');

                            const btnSelectTool = new Common.UI.Button({
                                id: 'tlbtn-selecttool',
                                cls: 'btn-toolbar x-huge icon-top',
                                iconCls: 'toolbar__icon btn-select',
                                lock: [Common.enumLock.disableOnStart],
                                caption: this.toolbar.capBtnSelect,
                                toggleGroup: 'select-tools-tb',
                                enableToggle: true,
                                allowDepress: false,
                                dataHint: '1',
                                dataHintDirection: 'bottom',
                                dataHintOffset: 'small'
                            });
                            this.toolbar.toolbarControls.push(btnSelectTool);
                            Common.Utils.injectComponent($panel.find('#slot-btn-select-tool'), btnSelectTool);

                            const btnHandTool = new Common.UI.Button({
                                id: 'tlbtn-handtool',
                                cls: 'btn-toolbar x-huge icon-top',
                                iconCls: 'toolbar__icon btn-big-hand-tool',
                                lock: [Common.enumLock.disableOnStart],
                                caption: this.toolbar.capBtnHand,
                                toggleGroup: 'select-tools-tb',
                                enableToggle: true,
                                allowDepress: false,
                                dataHint: '1',
                                dataHintDirection: 'bottom',
                                dataHintOffset: 'small'
                            });
                            this.toolbar.toolbarControls.push(btnHandTool);
                            Common.Utils.injectComponent($panel.find('#slot-btn-hand-tool'), btnHandTool);

                            // this.api.asc_registerCallback('asc_onChangeViewerTargetType', _.bind(this.onChangeViewerTargetType, this));
                            btnSelectTool.updateHint(this.toolbar.tipSelectTool);
                            btnHandTool.updateHint(this.toolbar.tipHandTool);
                            btnSelectTool.toggle(true, true);

                            const on_select_tool = function (type, btn, state) {
                                if (state) {
                                    this.api.asc_setViewerTargetType(type);
                                    Common.NotificationCenter.trigger('edit:complete', this.toolbar);
                                }
                            }

                            btnSelectTool.on('toggle', on_select_tool.bind(this, 'select'));
                            btnHandTool.on('toggle', on_select_tool.bind( this, 'hand'));
                        }
                    }
                }

                this.toolbar.setVisible('home', false);
                this.toolbar.setVisible('forms', false);
            }
        },

        onAppReady: function (options) {
            const app = DE;
            let view = app.getController('Toolbar').getView('Toolbar');
            view.setVisible('protect', false);
        },

        onDocumentReady: function () {
            if (this.appOptions.showSaveButton) {
                const appHeader = DE.getController('Viewport').getView('Common.Views.Header');
                appHeader.btnQuickAccess.menu.items.forEach(function (item) {
                    if (item.value === 'save')
                        item.setVisible(false);
                });
            }
        },

        setTabVisible: function (tab, visible) {
            if (tab == 'protect' || tab == 'draw' || tab == 'review')
                visible = this.editUnlocked;

            Common.UI.Mixtbar.prototype.setVisible.call(this.toolbar, tab, visible);
        },

        unlockEdit: function () {
            if ( this.isPDFForm && !this.editUnlocked ) {
                this.editUnlocked = true;
                // this.api.asc_setViewMode(!this.appOptions.isEdit && !this.appOptions.isRestrictedEdit);
                this.api.asc_setViewMode(!this.init.isEdit);
                this.api.asc_setRestriction(Asc.c_oAscRestrictionType.None, this.api.asc_getRestrictionSettings());

                const app = this.getApplication();
                let controller = app.getController('Statusbar');
                controller.getView('Statusbar').$el.find('.el-edit, .el-review').show();
                controller.onAppShowed(this.appOptions);

                // let view = app.getController('Viewport').getView('Viewport');
                // view.applyEditorMode();

                let view = app.getController('RightMenu').getView('RightMenu');
                view.show();

                view = app.getController('LeftMenu').getView('LeftMenu').menuFile;
                view.setMode(this.appOptions);

                // quick access title button save
                if (this.appOptions.showSaveButton) {
                    const appHeader = DE.getController('Viewport').getView('Common.Views.Header');
                    appHeader.btnQuickAccess.menu.items.forEach(function (item) {
                        if (item.value === 'save')
                            item.setVisible(true);
                    });
                    if ( Common.localStorage.getBool('de-quick-access-save', true) )
                        appHeader.btnSave.show();
                }

                Common.NotificationCenter.trigger('layout:changed', 'rightmenu');

                // toolbar
                this.toolbar.setVisible('ins', true);
                this.toolbar.setVisible('layout', true);
                this.toolbar.setVisible('links', true);
                this.toolbar.setVisible('home', true);
                this.toolbar.setVisible('forms', true);
                this.toolbar.setVisible('formshome', false);
                this.toolbar.setTab('forms');

                view = DE.getController('Common.Controllers.ReviewChanges').getView('Common.Views.ReviewChanges');
                const is_review_visible = (this.appOptions.isEdit || this.appOptions.canViewReview || view.canComments) && Common.UI.LayoutManager.isElementVisible('toolbar-collaboration');
                if ( is_review_visible )
                    Common.NotificationCenter.trigger('tab:visible', 'review', is_review_visible);
                Common.NotificationCenter.trigger('tab:visible', 'draw', Common.UI.LayoutManager.isElementVisible('toolbar-draw'));
                if (this.appOptions.canProtect) {
                    Common.NotificationCenter.trigger('tab:visible', 'protect', Common.UI.LayoutManager.isElementVisible('toolbar-protect'));
                }

                Common.NotificationCenter.trigger('form:startedit', {});
            }
        },

        getIsEdit: function () {
            return this.initIsEdit();
        },

        initIsEdit: function (initvalue) {
            if (initvalue !== undefined) {
                this.init.isEdit = initvalue;
            }

            if (this.isPDFForm) {
                if (this.editUnlocked !== true)
                    return false;
                else return !!this.appOptions ? this.appOptions.isEdit : this.init.isEdit;
            }
            else return initvalue == undefined && this.init.isEdit;
        },
    });
});