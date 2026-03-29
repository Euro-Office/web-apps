define([ 'core'], function () {
    'use strict';

    DE.Controllers.OpenFormWrapper = Backbone.Controller.extend({
        initialize: function () {
            this.isPDFForm = !!window.isPDFForm;
            this.init = {};
        },
        onLaunch: function () {
            this.api = this.getApplication().getController('Viewport').getApi();
            this.api.asc_registerCallback('asc_onGetEditorPermissions', this.onEditorPermissions.bind(this));
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

                if (opts.canFeatureContentControl && opts.canFeatureForms || opts.isRestrictedEdit && opts.canFillForms) {
                    if (opts.isFormCreator) {
                        const forms = app.getController('FormsTab');

                        // Common.NotificationCenter.off('app:ready', forms.view.onAppReady);
                        // delete forms.view;

                        this.formsTabView = forms.createView('FormsTab', {
                            toolbar: this.toolbar,
                            config: opts,
                            api: this.api
                        });
                        // const func_app_ready_orig = forms.view.onAppReady;
                        // Common.NotificationCenter.off('app:ready', forms.view.onAppReady);
                        // forms.view.onAppReady = cfg => {
                        //     console.log('custom on forms app ready');
                        //     // func_app_ready_orig(config);
                        // };
                        // forms.setApi(this.api).setConfig({toolbar: me, config: config});
                        const $panel = this.formsTabView.getPanel();
                        if (1 && $panel) {
                            const tab = {caption: this.toolbar.textTabHome, action: 'forms1', dataHintTitle: 'M'};
                            this.toolbar.addTab(tab, $panel, 5);
                            this.toolbar.setVisible('forms1', true);
                            // Array.prototype.push.apply(this.toolbar.lockControls, forms.getView('FormsTab').getButtons());
                            // !compactview && (config.isFormCreator || config.isRestrictedEdit && config.canFillForms) && me.toolbar.setTab('forms');
                        }
                    }
                }

                this.toolbar.setVisible('home', false);
                // const $panel = this.toolbar.getTab('home');
                // $panel.hide();
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
        isFormEmulateView: function () {},
        turnOffViewEmulation: function () {},
        getIsEdit: function (initvalue) {
            if (this.isPDFForm) {
                if (initvalue !== undefined) {
                    this.init.isEdit = initvalue;
                }

                if (this.editUnlocked !== true)
                    return false;
                else return !!this.appOptions ? this.appOptions.isEdit : this.init.isEdit;
            }
            else return initvalue;
        },
    });
});