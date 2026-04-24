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
 *  FormsTab.js
 *
 *  Created on 06.10.2020
 *
 */

define([
    'common/main/lib/component/BaseView',
], function () {
    'use strict';

    DE.Views.FormsTabSec = Common.UI.BaseView.extend((function(){
        var template =
        '<section class="panel" data-tab="formshome" role="tabpanel" aria-labelledby="formshome">' +
            // '<div class="group pdf-buttons" style="display: none;">' +
            //     '<span class="btn-slot text x-huge" id="slot-btn-hand-tool"></span>' +
            //     '<span class="btn-slot text x-huge" id="slot-btn-select-tool"></span>' +
            // '</div>' +
            // '<div class="separator long pdf-buttons" style="display: none;"></div>' +
            '<div class="group small pdf-buttons" style="display: none;">' +
                '<div class="elset">' +
                    '<span class="btn-slot" id="slot-btn-pages" style="width: 95px;"></span>' +
                '</div>' +
                '<div class="elset">' +
                    '<span class="btn-slot" id="slot-btn-first-page"></span>' +
                    '<span class="btn-slot margin-left-5" id="slot-btn-prev-page"></span>' +
                    '<span class="btn-slot margin-left-5" id="slot-btn-next-page"></span>' +
                    '<span class="btn-slot margin-left-5" id="slot-btn-last-page"></span>' +
                '</div>' +
            '</div>' +
            '<div class="separator long pdf-buttons1" style="display: none;"></div>' +
            '<div class="group small pdf-buttons1" style="display: none;">' +
                '<div class="elset" style="display: flex;">' +
                    '<span class="btn-slot slot-field-zoom" style="flex-grow: 1;"></span>' +
                '</div>' +
                '<div class="elset" style="text-align: center;">' +
                    '<span class="btn-slot text font-size-normal slot-lbl-zoom" style="text-align: center;margin-top: 4px;"></span>' +
                '</div>' +
            '</div>' +
            '<div class="group small pdf-buttons" style="display: none;">' +
                '<div class="elset">' +
                    '<span class="btn-slot text slot-btn-ftp" style="text-align: center;"></span>' +
                '</div>' +
                '<div class="elset">' +
                    '<span class="btn-slot text slot-btn-ftw" style="text-align: center;"></span>' +
                '</div>' +
            '</div>' +
            '<div class="separator long pdf-buttons" style="display: none;"></div>' +
            '<div class="group no-group-mask" style="">' +
                '<span class="btn-slot text x-huge" id="slot-btn-form-view-roles"></span>' +
                '<span class="btn-slot text x-huge hidden" id="slot-btn-form-final"></span>' +
                '<span class="btn-slot text x-huge" id="slot-btn-form-prev"></span>' +
                '<span class="btn-slot text x-huge" id="slot-btn-form-next"></span>' +
                '<span class="btn-slot text x-huge" id="slot-btn-form-clear"></span>' +
            '</div>' +
            '<div class="separator long save-separator" style="display: none;"></div>' +
            '<div class="group no-group-mask" style="">' +
                '<span class="btn-slot text x-huge" id="slot-btn-form-submit"></span>' +
                '<span class="btn-slot text x-huge" id="slot-btn-form-save"></span>' +
            '</div>' +
        '</section>';

        function setEvents() {
            var me = this;
            if (this.btnViewFormRoles) {
                this.btnViewFormRoles.on('click', function (b, e) {
                    var item;
                    if (b.menu) {
                        item = b.menu.getChecked();
                        if (item) {
                            item = item.caption;
                        } else if (me._state.roles && me._state.roles.length>0) {
                            item = me._state.roles[0].asc_getSettings().asc_getName();
                        }
                    }
                    me.fireEvent('forms:preview', [b.pressed, item]);
                });
                if (this.btnViewFormRoles.menu) {
                    this.btnViewFormRoles.menu.on('item:click', _.bind(function (menu, item) {
                        if (!!item.checked) {
                            me.btnViewFormRoles.toggle(true, true);
                            me.fireEvent('forms:preview', [true, item.caption]);
                        }
                    }, me));
                    this.btnViewFormRoles.menu.on('show:after',  function (menu) {
                        me.fillRolesMenu();
                    });
                }
            }
            this.btnFinal && this.btnFinal.on('click', function (b, e) {
                // me.fireEvent('forms:final', [b.pressed, true]);
            });
            this.btnClear && this.btnClear.on('click', function (b, e) {
                me.fireEvent('forms:clear');
            });
            this.btnPrevForm && this.btnPrevForm.on('click', function (b, e) {
                me.fireEvent('forms:goto', ['prev']);
            });
            this.btnNextForm && this.btnNextForm.on('click', function (b, e) {
                me.fireEvent('forms:goto', ['next']);
            });
            this.btnSubmit && this.btnSubmit.on('click', function (b, e) {
                me.fireEvent('forms:submit');
            });
            this.btnSaveForm && this.btnSaveForm.on('click', function (b, e) {
                me.fireEvent('forms:save');
            });

            if (this.fieldPages) {
                this.fieldPages.on('changed:after', function () {
                    me.fireEvent('forms:gopage', ['', parseInt(me.fieldPages.getValue())]);
                });
                this.fieldPages.on('inputleave', function(){ Common.NotificationCenter.trigger('edit:complete', this);});
                this.fieldPages.cmpEl && this.fieldPages.cmpEl.on('focus', 'input.form-control', function() {
                    setTimeout(function(){me.fieldPages._input && me.fieldPages._input.select();}, 1);
                });
            }
            this.btnFirstPage && this.btnFirstPage.on('click', function () {
                me.fireEvent('forms:gopage', ['first']);
            });
            this.btnLastPage && this.btnLastPage.on('click', function () {
                me.fireEvent('forms:gopage', ['last']);
            });
            this.btnPrevPage && this.btnPrevPage.on('click', function () {
                me.fireEvent('forms:gopage', ['prev']);
            });
            this.btnNextPage && this.btnNextPage.on('click', function () {
                me.fireEvent('forms:gopage', ['next']);
            });

        }

        return {

            options: {},

            initialize: function (options) {
                Common.UI.BaseView.prototype.initialize.call(this);
                this.toolbar = options.toolbar;
                this.appConfig = options.config;
                this.api = options.api;

                this.paragraphControls = [];
                this._state = {};

                var me = this;
                var _set = Common.enumLock;

                if (this.appConfig.isRestrictedEdit && this.appConfig.canFillForms) {
                    if (this.appConfig.isPDFForm) {
                        this.fieldPages = new Common.UI.InputFieldFixed({
                            id: 'id-toolbar-txt-pages',
                            style       : 'width: 100%;',
                            cls         : 'text-align-right',
                            maskExp     : /[0-9]/,
                            allowBlank  : true,
                            validateOnChange: false,
                            fixedValue: '/ 1',
                            value: 1,
                            lock: [_set.disableOnStart],
                            validation  : function(value) {
                                if (/(^[0-9]+$)/.test(value)) {
                                    value = parseInt(value);
                                    if (value===undefined || value===null || value<1)
                                        me.fieldPages.setValue((me.api ? me.api.getCurrentPage() : 0)+1);
                                } else
                                    me.fieldPages.setValue((me.api ? me.api.getCurrentPage() : 0)+1);

                                return true;
                            }
                        });
                        this.paragraphControls.push(this.fieldPages);

                        this.btnFirstPage = new Common.UI.Button({
                            id          : 'id-toolbar-btn-first-page1',
                            cls         : 'btn-toolbar',
                            iconCls     : 'toolbar__icon btn-firstitem icon-rtl',
                            lock: [_set.disableOnStart, _set.firstPage],
                            dataHint    : '1',
                            dataHintDirection: 'bottom'
                        });
                        this.paragraphControls.push(this.btnFirstPage);

                        this.btnLastPage = new Common.UI.Button({
                            id          : 'id-toolbar-btn-last-page1',
                            cls         : 'btn-toolbar',
                            iconCls     : 'toolbar__icon btn-lastitem icon-rtl',
                            lock: [_set.disableOnStart, _set.lastPage],
                            dataHint    : '1',
                            dataHintDirection: 'bottom'
                        });
                        this.paragraphControls.push(this.btnLastPage);

                        this.btnPrevPage = new Common.UI.Button({
                            id          : 'id-toolbar-btn-prev-page',
                            cls         : 'btn-toolbar',
                            iconCls     : 'toolbar__icon btn-previtem icon-rtl',
                            lock: [_set.disableOnStart, _set.firstPage],
                            dataHint    : '1',
                            dataHintDirection: 'bottom'
                        });
                        this.paragraphControls.push(this.btnPrevPage);
                        //
                        this.btnNextPage = new Common.UI.Button({
                            id          : 'id-toolbar-btn-next-page',
                            cls         : 'btn-toolbar',
                            iconCls     : 'toolbar__icon btn-nextitem icon-rtl',
                            lock: [_set.disableOnStart, _set.lastPage],
                            dataHint    : '1',
                            dataHintDirection: 'bottom'
                        });
                        this.paragraphControls.push(this.btnNextPage);
                    }
                } else {
                    this.btnViewFormRoles = new Common.UI.Button({
                        cls: 'btn-toolbar x-huge icon-top',
                        iconCls: 'toolbar__icon btn-big-sheet-view',
                        lock: [ _set.previewReviewMode, _set.formsNoRoles, _set.viewFormFinal, _set.lostConnect, _set.disableOnStart, _set.docLockView, _set.docLockForms, _set.docLockComments, _set.viewMode],
                        caption: this.capBtnView,
                        split: Common.UI.FeaturesManager.isFeatureEnabled('roles', true),
                        menu: Common.UI.FeaturesManager.isFeatureEnabled('roles', true) ? new Common.UI.Menu({
                            cls: 'menu-roles',
                            maxHeight: 270,
                            style: 'max-width: 400px;',
                            items: []
                        }) : false,
                        enableToggle: true,
                        dataHint: '1',
                        dataHintDirection: 'bottom',
                        dataHintOffset: 'small'
                    });
                    this.paragraphControls.push(this.btnViewFormRoles);

                    this.btnFinal = new Common.UI.Button({
                        cls: 'btn-toolbar x-huge icon-top',
                        iconCls: 'toolbar__icon btn-make-final',
                        lock: [ _set.previewReviewMode, _set.viewFormNotFinal, _set.lostConnect, _set.disableOnStart, _set.docLockView, _set.docLockForms, _set.docLockComments, _set.viewMode],
                        caption: this.capBtnFinal,
                        enableToggle: true,
                        dataHint: '1',
                        dataHintDirection: 'bottom',
                        dataHintOffset: 'small'
                    });
                    this.paragraphControls.push(this.btnFinal);

                    var itemsTemplate =
                        [
                            '<% _.each(items, function(item) { %>',
                            '<li id="<%= item.id %>" data-value="<%= Common.Utils.String.htmlEncode(item.value) %>"<% if (item.value === 0) { %> class="border-top"<% } %>>',
                                '<% if (item.value === 0) { %>',
                                '<a tabindex="-1" type="menuitem" style="display: block; padding: ' + (Common.UI.isRTL() ? '5px 24px 5px 20px' : '5px 20px 5px 24px') + ';">',
                                    '<span class="menu-item-icon menu__icon btn-zoomup"></span>',
                                    '<%= Common.Utils.String.htmlEncode(item.displayValue) %>',
                                '</a>',
                                '<% } else { %>',
                                '<a tabindex="-1" type="menuitem" style="padding-' + (Common.UI.isRTL() ? 'right' : 'left') + ': 10px;">',
                                    '<span class="color" style="background: <%= item.color %>;"></span>',
                                    '<div style="overflow: hidden; text-overflow: ellipsis;"><%= Common.Utils.String.htmlEncode(item.displayValue) %></div>',
                                '</a>',
                                '<% } %>',
                            '</li>',
                            '<% }); %>'
                        ];

                    var template = [
                        '<div class="input-group combobox input-group-nr <%= cls %>" id="<%= id %>" style="<%= style %>">',
                            '<div class="form-control" style="display: flex; align-items: center; line-height: 14px; cursor: pointer; overflow: hidden;text-overflow: ellipsis;white-space: nowrap;<%= style %>" data-hint="<%= dataHint %>" data-hint-direction="<%= dataHintDirection %>" data-hint-offset="<%= dataHintOffset %>"></div>',
                            '<div style="display: table-cell;"></div>',
                            '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button>',
                            '<ul class="dropdown-menu <%= menuCls %>" style="<%= menuStyle %>" role="menu">'].concat(itemsTemplate).concat([
                            '</ul>',
                        '</div>'
                    ]);

                    this.cmbRoles = new Common.UI.ComboBoxCustom({
                        cls: 'menu-roles',
                        menuCls: 'menu-absolute',
                        menuStyle: 'min-width: 130px; max-height: 205px;max-width: 400px;',
                        // menuAlignEl: $(this.el).parent(),
                        restoreMenuHeightAndTop: 85,
                        style: 'width: 130px;',
                        lock: [ _set.previewReviewMode, _set.viewFormMode, _set.lostConnect, _set.disableOnStart, _set.docLockView, _set.docLockForms, _set.docLockComments, _set.viewMode],
                        editable: false,
                        template    : _.template(template.join('')),
                        itemsTemplate: _.template(itemsTemplate.join('')),
                        data: [],
                        dataHint: '1',
                        dataHintDirection: 'bottom',
                        dataHintOffset: 'small',
                        updateFormControl: function(record) {
                            var formcontrol = $(this.el).find('.form-control');
                            if (record) {
                                formcontrol[0].innerHTML =
                                    `<span class="color" style="background: ${record.get('color')};"></span><div style="overflow: hidden; text-overflow: ellipsis;">${Common.Utils.String.htmlEncode(record.get('displayValue'))}</div>`;
                            } else
                                formcontrol[0].innerHTML = '';
                        }
                    });
                    this.paragraphControls.push(this.cmbRoles);

                    this.lblRoles = new Common.UI.Label({
                        caption: this.textFillFor,
                        lock: [ _set.previewReviewMode, _set.viewFormMode, _set.lostConnect, _set.disableOnStart, _set.docLockView, _set.docLockForms, _set.docLockComments, _set.viewMode]
                    });
                    this.paragraphControls.push(this.lblRoles);
                }

                this.btnClear = new Common.UI.Button({
                    cls: 'btn-toolbar x-huge icon-top',
                    iconCls: 'toolbar__icon btn-clear-style',
                    caption: this.textClear,
                    lock: [ _set.lostConnect, _set.viewMode, _set.disableOnStart, _set.formSigned],
                    visible: this.appConfig.isRestrictedEdit && this.appConfig.canFillForms && this.appConfig.isPDFForm,
                    dataHint: '1',
                    dataHintDirection: 'bottom',
                    dataHintOffset: 'small'
                });
                this.paragraphControls.push(this.btnClear);

                this.btnPrevForm = new Common.UI.Button({
                    cls: 'btn-toolbar x-huge icon-top',
                    iconCls: 'toolbar__icon btn-previous-field icon-rtl',
                    lock: [ _set.previewReviewMode, _set.lostConnect, _set.disableOnStart, _set.docLockView, _set.docLockComments, _set.viewMode],
                    caption: this.capBtnPrev,
                    visible: this.appConfig.isRestrictedEdit && this.appConfig.canFillForms && this.appConfig.isPDFForm,
                    // disabled: this.appConfig.isEdit && this.appConfig.canFeatureContentControl && this.appConfig.canFeatureForms, // disable only for edit mode
                    dataHint: '1',
                    dataHintDirection: 'bottom',
                    dataHintOffset: 'small'
                });
                this.paragraphControls.push(this.btnPrevForm);

                this.btnNextForm = new Common.UI.Button({
                    cls: 'btn-toolbar x-huge icon-top',
                    iconCls: 'toolbar__icon btn-next-field icon-rtl',
                    lock: [ _set.previewReviewMode, _set.lostConnect, _set.disableOnStart, _set.docLockView, _set.docLockComments, _set.viewMode],
                    caption: this.capBtnNext,
                    visible: this.appConfig.isRestrictedEdit && this.appConfig.canFillForms && this.appConfig.isPDFForm,
                    // disabled: this.appConfig.isEdit && this.appConfig.canFeatureContentControl && this.appConfig.canFeatureForms, // disable only for edit mode,
                    dataHint: '1',
                    dataHintDirection: 'bottom',
                    dataHintOffset: 'small'
                });
                this.paragraphControls.push(this.btnNextForm);

                if (this.appConfig.canSubmitForms) {
                    if (this.appConfig.isRestrictedEdit && this.appConfig.canFillForms) {
                        this.btnSubmit = new Common.UI.Button({
                            cls: 'btn-text-default auto back-color',
                            caption: this.capBtnSubmit,
                            lock: [_set.lostConnect, _set.disableOnStart, _set.requiredNotFilled, _set.submit, _set.formSigned],
                            dataHint: '0',
                            dataHintDirection: 'bottom',
                            dataHintOffset: 'big'
                        });
                    } else {
                        this.btnSubmit = new Common.UI.Button({
                            cls: 'btn-toolbar x-huge icon-top',
                            iconCls: 'toolbar__icon btn-submit-form',
                            lock: [_set.lostConnect, _set.disableOnStart, _set.requiredNotFilled, _set.submit, _set.formSigned],
                            caption: this.capBtnSubmit,
                            // disabled: this.appConfig.isEdit && this.appConfig.canFeatureContentControl && this.appConfig.canFeatureForms, // disable only for edit mode,
                            dataHint: '1',
                            dataHintDirection: 'bottom',
                            dataHintOffset: 'small'
                        });
                    }
                    this.paragraphControls.push(this.btnSubmit);
                } else if (this.appConfig.canDownloadForms) {
                    this.btnSaveForm = new Common.UI.Button({
                        cls: 'btn-toolbar x-huge icon-top',
                        lock: [_set.lostConnect, _set.disableOnStart],
                        iconCls: 'toolbar__icon btn-save-form',
                        caption: this.appConfig.canRequestSaveAs || !!this.appConfig.saveAsUrl ? this.capBtnSaveForm : (this.appConfig.isOffline ? this.capBtnSaveFormDesktop : this.capBtnDownloadForm),
                        // disabled: this.appConfig.isEdit && this.appConfig.canFeatureContentControl && this.appConfig.canFeatureForms, // disable only for edit mode,
                        dataHint: '1',
                        dataHintDirection: 'bottom',
                        dataHintOffset: 'small'
                    });
                    !(this.appConfig.isRestrictedEdit && this.appConfig.canFillForms) && this.paragraphControls.push(this.btnSaveForm);
                }
                Common.UI.LayoutManager.addControls(this.paragraphControls);
                Common.Utils.lockControls(Common.enumLock.disableOnStart, true, {array: this.paragraphControls});
                this._state = {disabled: false};
                Common.NotificationCenter.on('app:ready', this.onAppReady.bind(this));
            },

            render: function (el) {
                if ( el ) el.html( this.getPanel() );

                return this;
            },

            onAppReady: function (cfg) {
                var me = this;
                (new Promise(function (accept, reject) {
                    accept();
                })).then(function(){
                    const config = me.appConfig;
                    if (config.isEdit && config.canFeatureContentControl && config.canFeatureForms) {
                    } else if (config.isRestrictedEdit && config.canFillForms && config.isPDFForm) {
                        me.btnFirstPage.updateHint(me.tipFirstPage);
                        me.btnLastPage.updateHint(me.tipLastPage);
                        me.btnPrevPage.updateHint(me.tipPrevPage);
                        me.btnNextPage.updateHint(me.tipNextPage);
                    }
                    me.btnClear.updateHint(me.textClearFields);
                    me.btnPrevForm.updateHint(me.tipPrevForm);
                    me.btnNextForm.updateHint(me.tipNextForm);
                    me.btnSubmit && me.btnSubmit.updateHint(me.tipSubmit);
                    me.btnSaveForm && me.btnSaveForm.updateHint(config.canRequestSaveAs || !!config.saveAsUrl ? me.tipSaveForm : me.tipDownloadForm);

                    setEvents.call(me);
                });
            },

            getPanel: function () {
                this.$el = $(_.template(template)( {} ));
                var $host = this.$el;

                if (this.appConfig.isRestrictedEdit && this.appConfig.canFillForms) {
                    // this.btnSubmit ? this.btnSubmit.render($('#slot-btn-header-form-submit')) : $('#slot-btn-header-form-submit').hide();
                    if (this.appConfig.isPDFForm) {
                        this.fieldPages.render($host.find('#slot-btn-pages'));
                        this.btnFirstPage.render($host.find('#slot-btn-first-page'));
                        this.btnLastPage.render($host.find('#slot-btn-last-page'));
                        this.btnPrevPage.render($host.find('#slot-btn-prev-page'));
                        this.btnNextPage.render($host.find('#slot-btn-next-page'));
                        $host.find('.pdf-buttons').show();
                    }
                } else {
                    this.btnSubmit && this.btnSubmit.render($host.find('#slot-btn-form-submit'));

                    $host.find('.forms-buttons').show();
                }
                this.btnClear.render($host.find('#slot-btn-form-clear'));
                this.btnPrevForm.render($host.find('#slot-btn-form-prev'));
                this.btnNextForm.render($host.find('#slot-btn-form-next'));

                this.btnSaveForm && this.btnSaveForm.render($host.find('#slot-btn-form-save'));
                (this.btnSubmit && !(this.appConfig.isRestrictedEdit && this.appConfig.canFillForms) || this.btnSaveForm) && $host.find('.save-separator').show();
                this.appConfig.isRestrictedEdit && this.appConfig.canFillForms && this.appConfig.isPDFForm && this.showFillingForms(false);

                return this.$el;
            },

            fillRolesMenu: function(roles, lastViewRole) {
                if (!(this.btnViewFormRoles && this.btnViewFormRoles.menu && this.btnViewFormRoles.menu.isVisible())) {
                    this._state.roles = roles;
                    this._state.lastViewRole = lastViewRole;
                    return;
                }
                roles = roles || this._state.roles;
                lastViewRole = lastViewRole || this._state.lastViewRole;
                this._state.roles = this._state.lastViewRole = undefined;

                if (!roles) return;

                var checkedIndex = 0,
                    me = this;

                this.btnViewFormRoles.menu.removeAll();

                roles && roles.forEach(function(item, index) {
                    var role = item.asc_getSettings(),
                        color = role.asc_getColor();
                    if (role.asc_getName()===lastViewRole)
                        checkedIndex = index;
                    me.btnViewFormRoles.menu.addItem(new Common.UI.MenuItem({
                        caption: role.asc_getName() || me.textAnyone,
                        color: color ? '#' + Common.Utils.ThemeColor.getHexColor(color.get_r(), color.get_g(), color.get_b()) : 'transparent',
                        checkable: true,
                        toggleGroup: 'formtab-view-role',
                        template: _.template([
                            '<a id="<%= id %>"  tabindex="-1" type="menuitem" class="<%= options.cls %>" style="overflow: hidden; text-overflow: ellipsis;">',
                            '<span class="color" style="background: <%= options.color %>;"></span>',
                            '<%= Common.Utils.String.htmlEncode(caption) %>',
                            '</a>'
                        ].join(''))
                    }));
                });

                var len = this.btnViewFormRoles.menu.items.length>0;
                len && this.btnViewFormRoles.menu.items[checkedIndex].setChecked(true, true);
                Common.Utils.lockControls(Common.enumLock.formsNoRoles, !len,{array: [this.btnViewFormRoles]});
            },

            fillFillForCombo: function(roles, lastRoleInList) {
                if (!this.cmbRoles) return;
                
                var lastrole = this.cmbRoles.getSelectedRecord();
                lastrole = lastrole ? lastrole.value : '';

                var arr = [];
                var me = this;
                roles && roles.forEach(function(item) {
                    var role = item.asc_getSettings(),
                        color = role.asc_getColor();
                    arr.push({
                        displayValue: role.asc_getName() || me.textAnyone,
                        value: role.asc_getName(),
                        color: color ? '#' + Common.Utils.ThemeColor.getHexColor(color.get_r(), color.get_g(), color.get_b()) : 'transparent'
                    });
                });

                arr.push({ displayValue: this.textAddRole, value: 0 });

                this.cmbRoles.setData(arr);
                var rec = this.cmbRoles.store.findWhere({ value: lastrole });
                this.cmbRoles.setValue(rec ? lastrole : lastRoleInList);
            },

            show: function () {
                Common.UI.BaseView.prototype.show.call(this);
                this.fireEvent('show', this);
            },

            getButtons: function() {
                return this.paragraphControls;
            },

            setPreviewMode: function(state) {
                this.btnClear.setVisible(state);
                this.btnPrevForm.setVisible(state);
                this.btnNextForm.setVisible(state);
                this.btnSubmit && this.btnSubmit.setVisible(!state);
                this.btnSaveForm && this.btnSaveForm.setVisible(!state);
            },

            showFillingForms: function(visible) {
                this.btnClear.setVisible(visible);
                this.btnPrevForm.setVisible(visible);
                this.btnNextForm.setVisible(visible);
                visible ? this.btnPrevForm.$el.parents('.group').show().prev('.separator').show() :
                          this.btnPrevForm.$el.parents('.group').hide().prev('.separator').hide();
                this.btnSubmit && this.btnSubmit.setVisible(visible);
            },

            SetDisabled: function (state) {
                this._state.disabled = state;
                this.paragraphControls.forEach(function(button) {
                    if ( button ) {
                        button.setDisabled(state);
                    }
                }, this);
            },

            textClearFields: 'Clear All Fields',
            tipViewForm: 'View form',
            textNoHighlight: 'No highlighting',
            textClear: 'Clear Fields',
            capBtnPrev: 'Previous Field',
            capBtnNext: 'Next Field',
            capBtnSubmit: 'Submit',
            tipPrevForm: 'Go to the previous field',
            tipNextForm: 'Go to the next field',
            tipSubmit: 'Submit form',
            textSubmited: 'Form submitted successfully',
            textRequired: 'Fill all required fields to send form.',
            capBtnSaveForm: 'Save as pdf',
            tipSaveForm: 'Save a file as a fillable PDF',
            txtUntitled: 'Untitled',
            textCreateForm: 'Add fields and create a fillable PDF',
            textGotIt: 'Got it',
            capBtnManager: 'Manage Roles',
            tipManager: 'Manage Roles',
            capBtnDownloadForm: 'Download as pdf',
            tipDownloadForm: 'Download a file as a fillable PDF',
            textAnyone: 'Anyone',
            txtInlineText: 'Inline',
            txtInlineDesc: 'Insert inline text field',
            txtFixedText: 'Fixed',
            txtFixedDesc: 'Insert fixed text field',
            tipInlineText: 'Insert inline text field',
            tipFixedText: 'Insert fixed text field',
            //tipCreateField: 'To create a field select the desired field type on the toolbar and click on it. The field will appear in the document.',
            tipFormKey: 'You can assign a key to a field or a group of fields. When a user fills in the data, it will be copied to all the fields with the same key.',
            tipFormGroupKey: 'Group radio buttons to make the filling process faster. Choices with the same names will be synchronized. Users can only tick one radio button from the group.',
            tipFieldSettings: 'You can configure selected fields on the right sidebar. Click this icon to open the field settings.',
            tipHelpRoles: 'Use the Manage Roles feature to group fields by purpose and assign the responsible team members.',
            tipSaveFile: 'Click “Save as pdf” to save the form in the format ready for filling.',
            tipRolesLink: 'Learn more about roles',
            tipFieldsLink: 'Learn more about field parameters',
            capBtnSaveFormDesktop: 'Save as...',
            textSubmitOk: 'Your PDF form has been saved in the Complete section. You can fill out this form again and send another result.',
            textFilled: 'Filled',
            tipFirstPage: 'Go to the first page',
            tipLastPage: 'Go to the last page',
            tipPrevPage: 'Go to the previous page',
            tipNextPage: 'Go to the next page',
            capBtnSignature: 'Signature Field',
            tipSignField: 'Insert signature field',
            textFillFor: 'Insert fields for',
            textAddRole: 'Add recipient'
        }
    }()));
});