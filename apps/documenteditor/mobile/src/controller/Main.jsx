
import React, {Component, Fragment} from 'react';
import {inject} from "mobx-react";
import { f7 } from "framework7-react";
import { withTranslation } from 'react-i18next';
import { LocalStorage } from '../../../../common/mobile/utils/LocalStorage.mjs';
import CollaborationController from '../../../../common/mobile/lib/controller/collaboration/Collaboration.jsx';
import {InitReviewController as ReviewController} from '../../../../common/mobile/lib/controller/collaboration/Review.jsx';
import { onAdvancedOptions } from './settings/Download.jsx';
import {
    CommentsController,
    ViewCommentsController
} from "../../../../common/mobile/lib/controller/collaboration/Comments.jsx";
import About from '../../../../common/mobile/lib/view/About.jsx';
import EditorUIController from '../lib/patch.jsx';
import { fallbackSdkTranslations } from '../lib/fallbackTranslations.js';
import { resolveRegion, isImperialRegion } from '../lib/metricSettings.js';
import { buildProtectionFlags, protectionWarningKey, resolveRestrictions } from '../lib/docProtection.js';
import { resolveDownloadAs } from '../lib/downloadFormat.js';
import { shouldStoreLicenseType, resolveLicenseAction } from '../lib/licenseAction.js';
import ErrorController from "./Error.jsx";
import LongActionsController from "./LongActions.jsx";
import PluginsController from '../../../../common/mobile/lib/controller/Plugins.jsx';
import EncodingController from "./Encoding.jsx";
import DropdownListController from "./DropdownList.jsx";
import AddFormImageController from './add/AddFormImage.jsx';
import { Device } from '../../../../common/mobile/utils/device.jsx';
import { processArrayScripts } from '../../../../common/mobile/utils/processArrayScripts.js';
import '../../../../common/main/lib/util/LanguageInfo.js'
@inject(
    "users",
    "storeAppOptions",
    "storeDocumentSettings",
    "storeFocusObjects",
    "storeTextSettings",
    "storeParagraphSettings",
    "storeTableSettings",
    "storeDocumentInfo",
    "storeChartSettings",
    "storeApplicationSettings",
    "storeLinkSettings",
    "storeToolbarSettings",
    "storeNavigation",
    "storeVersionHistory"
)
class MainController extends Component {
    constructor(props) {
        super(props);
        window.editorType = 'de';

        this.LoadingDocument = -256;
        this.ApplyEditRights = -255;
        this.boxSdk = $$('#editor_sdk');
        this.fallbackSdkTranslations = fallbackSdkTranslations;

        this._state = {
            licenseType: false,
            isFromGatewayDownloadAs: false,
            isDocModified: false,
            docProtection: false,
            requireUserAction: true
        };

        this.defaultTitleText = __APP_TITLE_TEXT__;
        this.stackMacrosRequests = [];

        const { t } = this.props;
        this._t = t('Main', {returnObjects:true});
    }

    initSdk() {
        const on_script_load = () => {
            !window.sdk_scripts && (window.sdk_scripts = ['../../../../sdkjs/common/AllFonts.js',
                                                            '../../../../sdkjs/word/sdk-all-min.js']);
            let dep_scripts = ['../../../vendor/xregexp/xregexp-all-min.js',
                                '../../../vendor/socketio/socket.io.min.js'];
            dep_scripts.push(...window.sdk_scripts);

            const promise_get_script = (scriptpath) => {
                return new Promise((resolve, reject) => {
                    const script = document.createElement("script");
                    script.src = scriptpath;
                    script.onload = () => {
                        resolve('ok');
                    };
                    script.onerror = () => {
                        reject('error');
                    };

                    document.body.appendChild(script);
                });
            };

            const loadConfig = data => {
                const { t } = this.props;
                const _t = t('Main', {returnObjects:true});
                EditorUIController.isSupportEditFeature();

                this.editorConfig = Object.assign({}, this.editorConfig, data.config);

                this.props.storeAppOptions.setConfigOptions(this.editorConfig, _t);

                this.editorConfig.lang && this.api.asc_setLocale(this.editorConfig.lang);

                let value = LocalStorage.getItem("de-mobile-macros-mode");
                if (value === null) {
                    value = this.editorConfig.customization ? this.editorConfig.customization.macrosMode : 'warn';
                    value = (value === 'enable') ? 1 : (value === 'disable' ? 2 : 0);
                } else {
                    value = parseInt(value);
                }
                this.props.storeApplicationSettings.changeMacrosSettings(value);

                value = LocalStorage.getItem("de-mobile-allow-macros-request");
                this.props.storeApplicationSettings.changeMacrosRequest((value !== null) ? parseInt(value)  : 0);

                this.props.storeAppOptions.wopi = this.editorConfig.wopi;
                Common.Notifications.trigger('configOptionsFill');

                this.loadDefaultMetricSettings();

                if (this.editorConfig.canRequestRefreshFile) {
                    Common.Gateway.on('refreshfile', this.onRefreshFile.bind(this));
                    this.api.asc_registerCallback('asc_onRequestRefreshFile', this.onRequestRefreshFile.bind(this));
                }
            };

            const loadDocument = data => {
                this.permissions = {};
                this.document = data.doc;
                let docInfo = {};

                if (data.doc) {
                    this.permissions = Object.assign(this.permissions, data.doc.permissions);

                    const _options = Object.assign({}, data.doc.options, this.editorConfig.actionLink || {});
                    const _userOptions = this.props.storeAppOptions.user;
                    const _user = new Asc.asc_CUserInfo();
                    _user.put_Id(_userOptions.id);
                    _user.put_FullName(_userOptions.fullname);
                    _user.put_IsAnonymousUser(_userOptions.anonymous);

                    docInfo = new Asc.asc_CDocInfo();
                    docInfo.put_Id(data.doc.key);
                    docInfo.put_Url(data.doc.url);
                    docInfo.put_DirectUrl(data.doc.directUrl);
                    docInfo.put_Title(data.doc.title);
                    docInfo.put_Format(data.doc.fileType);
                    docInfo.put_VKey(data.doc.vkey);
                    docInfo.put_Options(_options);
                    docInfo.put_UserInfo(_user);
                    docInfo.put_CallbackUrl(this.editorConfig.callbackUrl);
                    docInfo.put_Token(data.doc.token);
                    docInfo.put_Permissions(data.doc.permissions);
                    docInfo.put_EncryptedInfo(this.editorConfig.encryptionKeys);
                    docInfo.put_Lang(this.editorConfig.lang);
                    docInfo.put_Mode(this.editorConfig.mode);
                    docInfo.put_Wopi(this.editorConfig.wopi);
                    this.editorConfig.shardkey && docInfo.put_Shardkey(this.editorConfig.shardkey);

                    let type = /^(?:(pdf|djvu|xps|oxps))$/.exec(data.doc.fileType);
                    let coEditMode = (type && typeof type[1] === 'string') ? 'strict' :  // offline viewer for pdf|djvu|xps|oxps
                                    !(this.editorConfig.coEditing && typeof this.editorConfig.coEditing == 'object') ? 'fast' : // fast by default
                                    this.editorConfig.mode === 'view' && this.editorConfig.coEditing.change!==false ? 'fast' : // if can change mode in viewer - set fast for using live viewer
                                    this.editorConfig.coEditing.mode || 'fast';
                    docInfo.put_CoEditingMode(coEditMode);

                    let enable = !this.editorConfig.customization || (this.editorConfig.customization.macros !== false);
                    docInfo.asc_putIsEnabledMacroses(!!enable);
                    enable = !this.editorConfig.customization || (this.editorConfig.customization.plugins !== false);
                    docInfo.asc_putIsEnabledPlugins(!!enable);

                    if (type && typeof type[1] === 'string') {
                        this.permissions.edit = this.permissions.review = false;
                    }
                }


                if(/^(pdf|docxf|oform|djvu|xps|oxps)$/.test(data.doc.fileType)) {
                    this.changeEditorBrandColorForPdf();
                }

                if(data.doc.fileType === 'pdf') {
                    if(this.permissions.fillForms === undefined) {
                        this.permissions.fillForms = this.permissions.edit !== false;
                    }

                    this.permissions.edit = this.permissions.review = this.permissions.comment = false;
                }

                this.api.asc_registerCallback('asc_onGetEditorPermissions', onEditorPermissions);
                this.api.asc_registerCallback('asc_onDocumentContentReady', onDocumentContentReady);
                this.api.asc_registerCallback('asc_onLicenseChanged', this.onLicenseChanged.bind(this));
                this.api.asc_registerCallback('asc_onMacrosPermissionRequest', this.onMacrosPermissionRequest.bind(this));
                this.api.asc_registerCallback('asc_onRunAutostartMacroses', this.onRunAutostartMacroses.bind(this));
                this.api.asc_setDocInfo(docInfo);
                this.api.asc_getEditorPermissions(this.editorConfig.licenseUrl, this.editorConfig.customerId);

                // Document Info

                const storeDocumentInfo = this.props.storeDocumentInfo;
                storeDocumentInfo.setDataDoc(this.document);
                storeDocumentInfo.setDocInfo(docInfo);

                // Common.SharedSettings.set('document', data.doc);

                if (data.doc) {
                    Common.Notifications.trigger('setdoctitle', data.doc.title);
                    if (data.doc.info) {
                       data.doc.info.author && console.log("Obsolete: The 'author' parameter of the document 'info' section is deprecated. Please use 'owner' instead.");
                       data.doc.info.created && console.log("Obsolete: The 'created' parameter of the document 'info' section is deprecated. Please use 'uploaded' instead.");
                   }
                }
            };

            const onEditorPermissions = params => {
                const licType = params.asc_getLicenseType();

                const { t } = this.props;
                const _t = t('Main', {returnObjects:true});
                // check licType
                if (Asc.c_oLicenseResult.Expired === licType ||
                    Asc.c_oLicenseResult.Error === licType ||
                    Asc.c_oLicenseResult.ExpiredTrial === licType ||
                    Asc.c_oLicenseResult.NotBefore === licType ||
                    Asc.c_oLicenseResult.ExpiredLimited === licType) {
                    f7.dialog.create({
                        title   : Asc.c_oLicenseResult.NotBefore === licType ? _t.titleLicenseNotActive : _t.titleLicenseExp,
                        text    : Asc.c_oLicenseResult.NotBefore === licType ? _t.warnLicenseBefore : _t.warnLicenseExp
                    }).open();
                    if (this._isDocReady || this._isPermissionsInited) { // receive after refresh file
                        Common.Notifications.trigger('api:disconnect');
                    }
                    return;
                }

                if ( this.onServerVersion(params.asc_getBuildVersion()) ) return;
                if ( this._isDocReady || this._isPermissionsInited ) {
                    this.api.asc_LoadDocument();
                    return;
                }

                this.appOptions.canLicense = (licType === Asc.c_oLicenseResult.Success || licType === Asc.c_oLicenseResult.SuccessLimit);

                const storeAppOptions = this.props.storeAppOptions;
                const editorConfig = window.native?.editorConfig;
                const config = storeAppOptions.config;
                const customization = config.customization;
                let isMobileForceView = undefined;
                if ( customization && customization.mobileForceView !== undefined )
                    isMobileForceView = customization.mobileForceView;
                else if ( editorConfig && editorConfig.mobileForceView !== undefined )
                    isMobileForceView = editorConfig.mobileForceView;

                const isForceView = isMobileForceView ?? customization?.mobile?.forceView ?? true;

                if(customization?.mobileForceView !== undefined && customization?.mobileForceView !== null) {
                    console.warn("Obsolete: The mobileForceView parameter is deprecated. Please use the forceView parameter from customization.mobile block");
                }

                storeAppOptions.setPermissionOptions(this.document, licType, params, this.permissions, EditorUIController.isSupportEditFeature());

                this.applyMode(storeAppOptions);

                this._isPermissionsInited = true;
                if ( storeAppOptions.isForm ) {
                    this.api.asc_addRestriction(Asc.c_oAscRestrictionType.OnlyForms);
                } else {
                    if( isForceView ) {
                        this.api.asc_addRestriction(Asc.c_oAscRestrictionType.View);
                    } else {
                        storeAppOptions.changeViewerMode(false);
                    }
                }

                this.api.asc_LoadDocument();
                this.api.Resize();
            };

            const onDocumentContentReady = () => {
                if (this._isDocReady)
                    return;

                const { t } = this.props;
                const appOptions = this.props.storeAppOptions;
                const isOForm = appOptions.isOForm;
                const appSettings = this.props.storeApplicationSettings;
                const customization = appOptions.customization;
                const _userOptions = this.props.storeAppOptions.user;

                f7.emit('resize');

                this._isDocReady = true;

                this.api.SetDrawingFreeze(false);
                
                if (appOptions.canFillForms) {
                    this.api.asc_registerCallback('asc_onUpdateSignatures', this.showSignatureTooltip.bind(this));
                }

                Common.Notifications.trigger('preloader:close');
                Common.Notifications.trigger('preloader:endAction', Asc.c_oAscAsyncActionType['BlockInteraction'], this.LoadingDocument);

                appOptions.isRestrictedEdit && appOptions.canFillForms && this.api.asc_SetHighlightRequiredFields(true);

                let value = LocalStorage.getItem("de-settings-zoom");
                const zf = (value !== null) ? parseInt(value) : (customization && customization.zoom ? parseInt(customization.zoom) : 100);
                (zf === -1) ? this.api.zoomFitToPage() : ((zf === -2) ? this.api.zoomFitToWidth() : this.api.zoom(zf>0 ? zf : 100));

                value = LocalStorage.getBool("de-mobile-spellcheck", !(customization && customization.spellcheck === false));
                appSettings.changeSpellCheck(value);
                this.api.asc_setSpellCheck(value);

                this.updateWindowTitle(true);

                value = LocalStorage.getBool("de-mobile-no-characters");
                appSettings.changeNoCharacters(value);
                this.api.put_ShowParaMarks(value);

                value = LocalStorage.getBool("de-mobile-hidden-borders");
                appSettings.changeShowTableEmptyLine(value);
                this.api.put_ShowTableEmptyLine(value);

                value = LocalStorage.itemExists('mobile-view') ?
                            LocalStorage.getBool('mobile-view') : !(customization?.mobile?.standardView ?? false);

                if(appOptions.isMobileViewAvailable && value) {
                    this.api.ChangeReaderMode();
                } else {
                    appOptions.changeMobileView();
                }

                if (appOptions.isEdit && this.needToUpdateVersion) {
                    Common.Notifications.trigger('api:disconnect');
                }

                Common.Gateway.on('processrightschange', this.onProcessRightsChange.bind(this));
                Common.Gateway.on('downloadas', this.onDownloadAs.bind(this));
                Common.Gateway.on('requestclose', this.onRequestClose.bind(this));
                Common.Gateway.on('setfavorite', this.onSetFavorite.bind(this));
                Common.Gateway.on('insertimage', this.insertImage.bind(this));

                Common.Gateway.sendInfo({
                    mode: appOptions.isEdit ? 'edit' : 'view'
                });

                this.api.Resize();
                this.api.zoomFitToWidth();
                this.api.asc_GetDefaultTableStyles && setTimeout(() => {this.api.asc_GetDefaultTableStyles()}, 1);
                this.applyLicense();

                Common.Notifications.trigger('document:ready');
                Common.Gateway.documentReady();
                appOptions.changeDocReady(true);
                this._state.requireUserAction = false;

                if(isOForm) {
                    f7.dialog.create({
                        title: t('Main.notcriticalErrorTitle'),
                        text: t('Main.textConvertForm'),
                        buttons: [
                            {
                                text: t('Main.textDownloadPdf'),
                                onClick: () => {
                                    this.api.asc_DownloadAs(new Asc.asc_CDownloadOptions(Asc.c_oAscFileType.PDF, false))
                                }
                            },
                            {
                                text: t('Main.textCancel')
                            }
                        ]
                    }).open();
                }

                if (appOptions.isRestrictedEdit && appOptions.canFillForms && appOptions.isForm) { // check filling status
                    let oform = this.api.asc_GetOForm();
                    let role = new AscCommon.CRestrictionSettings();
                    const _userOptions = this.props.storeAppOptions.user;
                    if (oform && _userOptions && _userOptions.roles) {
                        if (_userOptions.roles.length>0 && oform.asc_canFillRole(_userOptions.roles[0])) {
                            role.put_OFormRole(_userOptions.roles[0]);
                        } else {
                            role.put_OFormNoRole(true);
                            Common.Notifications.trigger('toolbar:deactivateeditcontrols');
                        }
                    }
                    this.api.asc_setRestriction(Asc.c_oAscRestrictionType.OnlyForms, role);
                }
            };

            processArrayScripts(dep_scripts, promise_get_script)
                .then(() => {
                    window["flat_desine"] = true;
                    const { t } = this.props;
                    let _translate = t('Main.SDK', { returnObjects: true });

                    if (!(typeof _translate === 'object' && _translate !== null && Object.keys(_translate).length > 0)) {
                        _translate = this.fallbackSdkTranslations
                    }

                    let result = /[\?\&]fileType=\b(pdf)|(djvu|xps|oxps)\b&?/i.exec(window.location.search),
                        isPDF = (!!result && result.length && typeof result[2] === 'string') || (!!result && result.length && typeof result[1] === 'string') && !window.isPDFForm;

                    const config = {
                        'id-view'  : 'editor_sdk',
                        'mobile'   : true,
                        'translate': _translate,
                        'isRtlInterface': Common.Locale.isCurrentLangRtl
                    };
                    let hcolor = (/(?:&|^)headingsColor=([^&]+)&?/i).exec(window.location.search.substring(1));
                    hcolor && (config['headings-color'] = '#' + hcolor[1]);
                    this.api = isPDF ? new Asc.PDFEditorApi(config) : new Asc.asc_docs_api(config);

                    Common.Notifications.trigger('engineCreated', this.api);
                    // Common.EditorApi = {get: () => this.api};

                    // Set font rendering mode
                    let value = LocalStorage.getItem("de-settings-fontrender");
                    if (value === null) {
                        value = window.devicePixelRatio > 1 ? '1' : '0';
                    }
                    switch (value) {
                        case '0': this.api.SetFontRenderingMode(3); break;
                        case '1': this.api.SetFontRenderingMode(1); break;
                        case '2': this.api.SetFontRenderingMode(2); break;
                    }

                    Common.Utils.Metric.setCurrentMetric(1); //pt

                    this.appOptions = {isCorePDF: isPDF};
                    this.props.storeAppOptions.isMobileViewAvailable = !this.appOptions.isCorePDF;
                    this.bindEvents();

                    Common.Gateway.on('init',           loadConfig);
                    Common.Gateway.on('showmessage',    this.onExternalMessage.bind(this));
                    Common.Gateway.on('opendocument',   loadDocument);
                    Common.Gateway.appReady();

                    Common.Gateway.on('internalcommand', function(data) {
                        if (data.command === 'hardBack') {
                            if ($$('.modal-in').length > 0) {
                                if ( !($$('.error-dialog.modal-in').length > 0) ) {
                                    f7.dialog.close();
                                }
                                Common.Gateway.internalMessage('hardBack', false);
                            } else
                                Common.Gateway.internalMessage('hardBack', true);
                        }
                    });
                    Common.Gateway.internalMessage('listenHardBack');
                }, error => {
                    console.log('promise failed ' + error);
                }
            );
        };

        if ( About.developVersion() ) {
            const script = document.createElement("script");
            script.src = "../../../../sdkjs/develop/sdkjs/word/scripts.js";
            script.async = true;
            script.onload = on_script_load;
            script.onerror = () => {
                console.log('error on load scripts');
            };

            document.body.appendChild(script);
        } else {
            on_script_load();
        }
    }

    
    showSignatureTooltip(valid, requested) {
        let hasSigned = false;
        if (valid) {
            valid.forEach(item => {
                if (item.asc_getIsForm()) {
                    hasSigned = true;
                }
            });
        }
        this.props.storeToolbarSettings.setIsSignatureForm(hasSigned);

        if (hasSigned) {
            const { t } = this.props;
            const _t = t('Main', { returnObjects: true });
            
            f7.dialog.create({
                text:  _t.txtSignedForm,
                buttons: [
                    {   
                        text: _t.textCancel,
                        onClick: () => {
                            f7.dialog.close(); 
                        }
                    }
                ]
            }).open();
        }
    }

    insertImage (data) {
        if (data && (data.url || data.images)) {
            if (data.url) {
                console.log("Obsolete: The 'url' parameter of the 'insertImage' method is deprecated. Please use 'images' parameter instead.");
            }

            let arr = [];

            if (data.images && data.images.length > 0) {
                for (let i = 0; i < data.images.length; i++) {
                    if (data.images[i] && data.images[i].url) {
                        arr.push(data.images[i].url);
                    }
                }
            } else if (data.url) {
                arr.push(data.url);
            }
               
            data._urls = arr;
        }

        this.insertImageFromStorage(data);
    }

    loadDefaultMetricSettings() {
        const appOptions = this.props.storeAppOptions;

        if (appOptions.location) {
            console.log("Obsolete: The 'location' parameter of the 'editorConfig' section is deprecated. Please use 'region' parameter in the 'editorConfig' section instead.");
        }

        const region = resolveRegion(appOptions, Common.util.LanguageInfo, navigator.language);

        if (isImperialRegion(region)) {
            Common.Utils.Metric.setDefaultMetric(Common.Utils.Metric.c_MetricUnits.inch);
        }
    }

    changeEditorBrandColorForPdf() {
        const bodyElement = document.body;
        bodyElement.classList.add('pdf-view');

        if(Device.android) {
            bodyElement.classList.add('pdf-view__android');
        }
    }

    applyMode (appOptions) {
        this.api.asc_enableKeyEvents(appOptions.isEdit);
        this.api.asc_setViewMode(!appOptions.isEdit && !appOptions.isRestrictedEdit);
        this.appOptions.isCorePDF && this.api.asc_setPdfViewer(!appOptions.isEdit && !appOptions.isRestrictedEdit);
        appOptions.isRestrictedEdit && appOptions.canComments && this.api.asc_setRestriction(Asc.c_oAscRestrictionType.OnlyComments);
        appOptions.isRestrictedEdit && appOptions.canFillForms && this.api.asc_setRestriction(Asc.c_oAscRestrictionType.OnlyForms);

        // Set units
        let value = LocalStorage.getItem('de-mobile-settings-unit');
        value = (value !== null) ? parseInt(value) : (appOptions.customization && appOptions.customization.unit ? Common.Utils.Metric.c_MetricUnits[appOptions.customization.unit.toLocaleLowerCase()] : Common.Utils.Metric.getDefaultMetric());
        (value === undefined) && (value = Common.Utils.Metric.getDefaultMetric());
        Common.Utils.Metric.setCurrentMetric(value);
        this.api.asc_SetDocumentUnits((value === Common.Utils.Metric.c_MetricUnits.inch) ? Asc.c_oAscDocumentUnits.Inch : ((value===Common.Utils.Metric.c_MetricUnits.pt) ? Asc.c_oAscDocumentUnits.Point : Asc.c_oAscDocumentUnits.Millimeter));

        this.api.asc_registerCallback('asc_onDocumentModifiedChanged', this.onDocumentModifiedChanged.bind(this));
        this.api.asc_registerCallback('asc_onDocumentCanSaveChanged',  this.onDocumentCanSaveChanged.bind(this));

        Common.Notifications.trigger('preloader:close');
        Common.Notifications.trigger('preloader:endAction', Asc.c_oAscAsyncActionType['BlockInteraction'], this.ApplyEditRights);

        if (!this._isDocReady) {
            Common.Notifications.trigger('preloader:beginAction', Asc.c_oAscAsyncActionType['BlockInteraction'], this.LoadingDocument);
        }

        // Message on window close
        window.onbeforeunload = this.onBeforeUnload.bind(this);
        window.onunload = this.onUnload.bind(this);
    }

    onDocumentModifiedChanged () {
        const isModified = this.api.asc_isDocumentCanSave();
        if (this._state.isDocModified !== isModified) {
            this._isDocReady && Common.Gateway.setDocumentModified(this.api.isDocumentModified());
        }

        this.updateWindowTitle();
    }

    onDocumentCanSaveChanged (isCanSave) {
        //
    }

    onBeforeUnload () {
        LocalStorage.save();

        if (this.api.isDocumentModified()) {
            this.api.asc_stopSaving();
            this.continueSavingTimer = window.setTimeout(() => {
                this.api.asc_continueSaving();
            }, 500);

            const { t } = this.props;
            const _t = t('Main', {returnObjects:true});
            return _t.leavePageText;
        }
    }

    onUnload () {
        if (this.continueSavingTimer)
            clearTimeout(this.continueSavingTimer);
    }

    onLicenseChanged (params) {
        const licType = params.asc_getLicenseType();

        if (shouldStoreLicenseType(licType, this.props.storeAppOptions, Asc.c_oLicenseResult, Asc.c_oLicenseMode)) {
            this._state.licenseType = licType;
        }

        if (this._isDocReady && this._state.licenseType)
            this.applyLicense();
    }

    applyLicense () {
        const { t } = this.props;
        const _t = t('Main', {returnObjects:true});
        const appOptions = this.props.storeAppOptions;

        const action = resolveLicenseAction({
            licenseType: this._state.licenseType,
            isSupportEditFeature: EditorUIController.isSupportEditFeature(),
            appOptions,
            licResult: Asc.c_oLicenseResult,
            licMode: Asc.c_oLicenseMode,
            companyName: __COMPANY_NAME__,
            translations: _t,
        });

        // Opensource warning has a 24-hour throttle via LocalStorage
        if (action.type === 'opensource-warning') {
            let value = LocalStorage.getItem("de-opensource-warning");
            value = (value !== null) ? parseInt(value) : 0;
            const now = (new Date).getTime();
            if (now - value > 86400000) {
                LocalStorage.setItem("de-opensource-warning", now);
                f7.dialog.create({
                    title: action.dialogTitle,
                    text: action.dialogText,
                    buttons: [{ text: _t.textOk }]
                }).open();
            }
            Common.Notifications.trigger('toolbar:activatecontrols');
            return;
        }

        if (action.disableLiveView) {
            appOptions.canLiveView = false;
            this.api.asc_SetFastCollaborative(false);
        }

        if (action.activateControls) {
            Common.Notifications.trigger('toolbar:activatecontrols');
        }

        if (action.deactivateEdit) {
            Common.Notifications.trigger('toolbar:deactivateeditcontrols');
            this.api.asc_coAuthoringDisconnect();
            Common.Notifications.trigger('api:disconnect');
        }

        if (action.dialogTitle) {
            let buttons;
            if (action.dialogButtons === 'buy') {
                buttons = [{
                    text: _t.textBuyNow,
                    bold: true,
                    onClick: function() { window.open(`${__PUBLISHER_URL__}`, "_blank"); }
                }, {
                    text: _t.textContactUs,
                    onClick: function() { window.open(`mailto:${__SALES_EMAIL__}`, "_blank"); }
                }];
            } else if (action.dialogButtons === 'contact') {
                buttons = [{
                    text: _t.textContactUs,
                    bold: true,
                    onClick: () => { window.open(`mailto:${__SALES_EMAIL__}`, "_blank"); }
                }, { text: _t.textClose }];
            } else {
                buttons = [{ text: _t.textOk }];
            }

            f7.dialog.create({
                title: action.dialogTitle,
                text: action.dialogText,
                buttons,
            }).open();
        }
    }

    onServerVersion (buildVersion) {
        if (this.changeServerVersion) return true;
        const { t } = this.props;
        const _t = t('Main', {returnObjects:true});

        if (About.appVersion() !== buildVersion && !About.compareVersions()) {
            this.changeServerVersion = true;
            f7.dialog.alert(
                _t.errorServerVersion,
                _t.titleServerVersion,
                () => {
                    setTimeout(() => {Common.Gateway.updateVersion()}, 0);
                });
            if (this._isDocReady) { // receive after refresh file
                Common.Notifications.trigger('api:disconnect');
            }
            return true;
        }
        return false;
    }

    bindEvents() {
        $$(window).on('resize', () => {
            this.api.Resize();
        });

        $$(window).on('popover:open popup:open sheet:open actions:open dialog:open searchbar:enable', () => {
            this.api.asc_enableKeyEvents(false);
        });

        this.api.asc_registerCallback('asc_onDocumentUpdateVersion', this.onUpdateVersion.bind(this));
        this.api.asc_registerCallback('asc_onServerVersion', this.onServerVersion.bind(this));
        this.api.asc_registerCallback('asc_onDocumentName', this.onDocumentName.bind(this));
        this.api.asc_registerCallback('asc_onPrintUrl', this.onPrintUrl.bind(this));
        this.api.asc_registerCallback('asc_onPrint', this.onPrint.bind(this));

        EditorUIController.initThemeColors && EditorUIController.initThemeColors();

        this.api.asc_registerCallback('asc_onDownloadUrl', this.onDownloadUrl.bind(this));
        this.api.asc_registerCallback('asc_onExpiredToken', this.onExpiredToken.bind(this));

        const storeDocumentSettings = this.props.storeDocumentSettings;
        this.api.asc_registerCallback('asc_onPageOrient', isPortrait => {
            storeDocumentSettings.resetPortrait(isPortrait);
        });
        this.api.asc_registerCallback('asc_onDocSize', (w, h) => {
            storeDocumentSettings.changeDocSize(w, h);
        });

        if ( this.appOptions.isCorePDF ) {
            this.api.asc_registerCallback('asc_onShowPDFFormsActions', (obj, x, y) => {
                switch (obj.type) {
                    case AscPDF.FIELD_TYPES.combobox:
                        this.onShowListActions(obj, x, y);
                        break;
                    case AscPDF.FIELD_TYPES.text:
                        this.onShowDateActions(obj, x, y);
                        break;
                }
            });

            this.api.asc_registerCallback('asc_onHidePdfFormsActions', () => {
                if ( this.cmpCalendar && this.cmpCalendar.opened )
                    this.cmpCalendar.close();
            });
        }

        this.api.asc_registerCallback('asc_onHideContentControlsActions', () => {
        });

        this.api.asc_registerCallback('asc_onShowContentControlsActions', (obj, x, y) => {
            const storeAppOptions = this.props.storeAppOptions;
            const isForm = storeAppOptions.isForm;
            const isViewer = storeAppOptions.isViewer;

            if (!storeAppOptions.isEdit && !(storeAppOptions.isRestrictedEdit && storeAppOptions.canFillForms) || this.props.users.isDisconnected || (isViewer && !isForm)) return;

            switch (obj.type) {
                case Asc.c_oAscContentControlSpecificType.DateTime:
                    this.onShowDateActions(obj, x, y);
                    break;
                case Asc.c_oAscContentControlSpecificType.Picture:
                case Asc.c_oAscContentControlSpecificType.Signature:
                    this.onShowImageActions(obj, x, y);
                    break;
                case Asc.c_oAscContentControlSpecificType.DropDownList:
                case Asc.c_oAscContentControlSpecificType.ComboBox:
                    this.onShowListActions(obj, x, y);
                    break;
            }
        });

        const storeTextSettings = this.props.storeTextSettings;
        storeTextSettings.resetFontsRecent(LocalStorage.getItem('dde-settings-recent-fonts'));

        EditorUIController.initFonts && EditorUIController.initFonts(storeTextSettings);
        EditorUIController.initFocusObjects && EditorUIController.initFocusObjects(this.props.storeFocusObjects);

        this.api.asc_registerCallback('asc_onVerticalAlign', (typeBaseline) => {
            storeTextSettings.resetTypeBaseline(typeBaseline);
        });
        this.api.asc_registerCallback('asc_onPrAlign', (align) => {
            storeTextSettings.resetParagraphAlign(align);
        });
        this.api.asc_registerCallback('asc_onTextColor', (color) => {
            storeTextSettings.resetTextColor(color);
        });
        this.api.asc_registerCallback('asc_onParaSpacingLine', (vc) => {
            storeTextSettings.resetLineSpacing(vc);
        });

        this.api.asc_registerCallback('asc_onTextHighLight', color => {
            let textPr = this.api.get_TextProps().get_TextPr();

            if(textPr) {
                color = textPr.get_HighLight();
                storeTextSettings.resetHighlightColor(color);
            }
        });

        // link settings
        const storeLinkSettings = this.props.storeLinkSettings;
        this.api.asc_registerCallback('asc_onCanAddHyperlink', (value) => {
            storeLinkSettings.canAddHyperlink(value);
        });

        //paragraph settings
        EditorUIController.initEditorStyles && EditorUIController.initEditorStyles(this.props.storeParagraphSettings);

        //table settings
        EditorUIController.initTableTemplates && EditorUIController.initTableTemplates(this.props.storeTableSettings);

        //chart settings
        EditorUIController.updateChartStyles && EditorUIController.updateChartStyles(this.props.storeChartSettings, this.props.storeFocusObjects);

        // Document Info

        const storeDocumentInfo = this.props.storeDocumentInfo;

        this.api.asc_registerCallback("asc_onGetDocInfoStart", () => {
            this.timerLoading = setTimeout(() => {
                storeDocumentInfo.switchIsLoaded(false);
            }, 2000);
        });

        this.api.asc_registerCallback("asc_onGetDocInfoStop", () => {
            storeDocumentInfo.switchIsLoaded(true);
        });

        this.api.asc_registerCallback("asc_onDocInfo", (obj) => {
            clearTimeout(this.timerLoading);

            this.objectInfo = obj;
            if(!this.timerDocInfo) {
                this.timerDocInfo = setInterval(() => {
                    storeDocumentInfo.changeCount(this.objectInfo);
                }, 300);
                storeDocumentInfo.changeCount(this.objectInfo);
            }
        });

        this.api.asc_registerCallback('asc_onGetDocInfoEnd', () => {
            clearTimeout(this.timerLoading);
            clearInterval(this.timerDocInfo);
            storeDocumentInfo.changeCount(this.objectInfo);
        });

        this.api.asc_registerCallback('asc_onMeta', (meta) => {
            if(meta) {
                storeDocumentInfo.changeTitle(meta.title);
                Common.Gateway.metaChange(meta);
            }
        });

        // Color Schemes

        this.api.asc_registerCallback('asc_onSendThemeColorSchemes', (arr) => {
            storeDocumentSettings.addSchemes(arr);
        });

        // Downloaded Advanced Options
        
        this.api.asc_registerCallback('asc_onAdvancedOptions', (type, advOptions, mode, formatOptions) => {
            const { t } = this.props;
            const _t = t("Settings", { returnObjects: true });
            const storeAppOptions = this.props.storeAppOptions;

            if(type == Asc.c_oAscAdvancedOptionsID.DRM) {
                storeAppOptions.setEncryptionFile(true);
                onAdvancedOptions(type, _t, this._isDocReady, this.props.storeAppOptions.canRequestClose, this.isDRM);
                this.isDRM = true;
            }
            if (this._state.requireUserAction) {
                Common.Gateway.userActionRequired();
                this._state.requireUserAction = false;
            }
        });

        // Protection document
        this.api.asc_registerCallback('asc_onChangeDocumentProtection', this.onChangeProtectDocument.bind(this));
        // this.api.asc_registerCallback('asc_onLockDocumentProtection', this.onLockDocumentProtection.bind(this));

        // Toolbar settings

        const storeToolbarSettings = this.props.storeToolbarSettings;
        this.api.asc_registerCallback('asc_onCanUndo', (can) => {
            if (this.props.users.isDisconnected) return;
            storeToolbarSettings.setCanUndo(can);
        });
        this.api.asc_registerCallback('asc_onCanRedo', (can) => {
            if (this.props.users.isDisconnected) return;
            storeToolbarSettings.setCanRedo(can);
        });

        this.api.asc_registerCallback('asc_onReplaceAll', this.onApiTextReplaced.bind(this));

        const storeNavigation = this.props.storeNavigation;

        this.api.asc_registerCallback('asc_onViewerBookmarksUpdate', (bookmarks) => {
            storeNavigation.initBookmarks(bookmarks);
        });

        Common.Notifications.on('markfavorite', this.markFavorite.bind(this));
    }

    insertImageFromStorage(data) {
        if (data && data._urls && (!data.c || data.c === 'add') && data._urls.length > 0) {
            this.api.AddImageUrl(data._urls, undefined, data.token);
        }
    }

    markFavorite(favorite) {
        Common.Gateway.metaChange({ favorite });
    }

    onSetFavorite(favorite) {
        const appOptions = this.props.storeAppOptions;
        appOptions.canFavorite && appOptions.setFavorite(!!favorite);
    }

    onExpiredToken() {
        const currentRev = this.props.storeVersionHistory.currentVersion.revision;
        
        setTimeout(() => {
            Common.Gateway.requestHistoryData(currentRev);
        }, 10);
    }

    onChangeProtectDocument() {
        const storeVersionHistory = this.props.storeVersionHistory;
        if (storeVersionHistory.isVersionHistoryMode) return;
        const props = this.getDocProps(true);
        if (!props) return;

        const { t } = this.props;
        const storeAppOptions = this.props.storeAppOptions;
        const isProtected = props && (props.isReadOnly || props.isCommentsOnly || props.isFormsOnly || props.isReviewOnly || props.isTrackedChanges);
        if(!storeAppOptions.isReviewOnly) {
            if(props.isReviewOnly) {
                this.api.asc_SetLocalTrackRevisions(true);
            } else {
                this.api.asc_SetLocalTrackRevisions(false);
            }
        }

        const warningKey = protectionWarningKey(props.type, Asc.c_oAscEDocProtect);
        const textWarningDialog = warningKey ? t(warningKey) : undefined;

        storeAppOptions.setProtection(isProtected);
        storeAppOptions.setTypeProtection(props.type);
        props && this.applyRestrictions(props.type);
        Common.Notifications.trigger('protect:doclock', props);

        if(isProtected) {
            f7.dialog.create({
                title: t('Main.titleDialogProtectedDocument'),
                text: textWarningDialog,
                buttons: [
                    {
                        text: t('Main.textOk')
                    }
                ]
            }).open();
        }
    }

    applyRestrictions(type) {
        const opts = this.props.storeAppOptions;
        const restrictions = resolveRestrictions(type, opts, Asc.c_oAscEDocProtect, Asc.c_oAscRestrictionType);
        restrictions.forEach(r => this.api.asc_setRestriction(r));
    }

    getDocProps(isUpdate) {
        const storeAppOptions = this.props.storeAppOptions;
        if (!storeAppOptions || !storeAppOptions.isEdit && !storeAppOptions.isRestrictedEdit) return;

        if (isUpdate || !this._state.docProtection) {
            const props = this.api.asc_getDocumentProtection();
            const type = props ? props.asc_getEditType() : Asc.c_oAscEDocProtect.None;

            this._state.docProtection = buildProtectionFlags(type, Asc.c_oAscEDocProtect);
        }

        return this._state.docProtection;
    }

    onApiTextReplaced(found, replaced) {
        const { t } = this.props;

        if (found) { 
            f7.dialog.alert(null, !(found - replaced > 0) ? t('Main.textReplaceSuccess').replace(/\{0\}/, `${replaced}`) : t('Main.textReplaceSkipped').replace(/\{0\}/, `${found - replaced}`));
        } else {
            f7.dialog.alert(null, t('Main.textNoMatches'));
        }
    }

    onShowDateActions(obj, x, y) {
        const { t } = this.props;
        const boxSdk = $$('#editor_sdk');

        let val = undefined;
        if ( !this.appOptions.isCorePDF ) {
            const specProps = obj.pr.get_DateTimePr();
            if ( specProps )
                val = specProps.get_FullDate();
        } else {
            if ( obj )
                val = obj.asc_GetValue();
        }

        let controlsContainer = boxSdk.find('#calendar-target-element');
        if (controlsContainer.length < 1) {
            controlsContainer = $$('<div id="calendar-target-element" style="position: absolute;"></div>');
            boxSdk.append(controlsContainer);
        }

        controlsContainer.css({left: `${x}px`, top: `${y}px`});

        this.cmpCalendar = f7.calendar.create({
            inputEl: '#calendar-target-element',
            dayNamesShort: [t('Edit.textSu'), t('Edit.textMo'), t('Edit.textTu'), t('Edit.textWe'), t('Edit.textTh'), t('Edit.textFr'), t('Edit.textSa')],
            monthNames: [t('Edit.textJanuary'), t('Edit.textFebruary'), t('Edit.textMarch'), t('Edit.textApril'), t('Edit.textMay'), t('Edit.textJune'), t('Edit.textJuly'), t('Edit.textAugust'), t('Edit.textSeptember'), t('Edit.textOctober'), t('Edit.textNovember'), t('Edit.textDecember')],
            backdrop: !Device.isPhone,
            closeByBackdropClick: !Device.isPhone,
            value: [val ? new Date(val) : new Date()],
            openIn: Device.isPhone ? 'sheet' : 'popover',
            on: {
                change: (calendar, value) => {
                    if(calendar.initialized && value[0]) {
                        if ( !this.appOptions.isCorePDF ) {
                            const specProps = obj.pr.get_DateTimePr();
                            specProps.put_FullDate(new Date(value[0]));
                            this.api.asc_SetContentControlDatePickerDate(specProps);
                            calendar.close();
                            this.api.asc_UncheckContentControlButtons();
                        } else {
                            const specProps = new AscCommon.CSdtDatePickerPr();
                            specProps.put_FullDate(new Date(value[0]));
                            this.api.asc_SetTextFormDatePickerDate(specProps);
                            calendar.close();
                        }
                    }
                },
                closed: () => {
                    this.cmpCalendar = null;
                },
            }
        });

        setTimeout(() => {
            this.cmpCalendar.open();
        }, 100)
    }

    onShowImageActions(obj, x, y) {
        if(!Device.isPhone) {
            const boxSdk = $$('#editor_sdk');
            let dropdownListTarget = boxSdk.find('#dropdown-image-list-target');

            if (dropdownListTarget.length < 1) {
                dropdownListTarget = $$('<div id="dropdown-image-list-target" style="position: absolute;"></div>');
                boxSdk.append(dropdownListTarget);
            }
            if (y > boxSdk.height()) {
                y = boxSdk.height();
            }
            dropdownListTarget.css({left: `${x}px`, top: `${y}px`});
            Common.Notifications.trigger('openFormImageListTablet', obj, x, y, boxSdk.height(), 260);
        } else {
            Common.Notifications.trigger('openFormImageListPhone', obj)
        }

        setTimeout(() => {
            this.api.asc_UncheckContentControlButtons();
        }, 500);
    }

    onShowListActions(obj, x, y) {
        if(!Device.isPhone) {
            const boxSdk = $$('#editor_sdk');
            let dropdownListTarget = boxSdk.find('#dropdown-list-target');
        
            if (dropdownListTarget.length < 1) {
                dropdownListTarget = $$('<div id="dropdown-list-target" style="position: absolute;"></div>');
                boxSdk.append(dropdownListTarget);
            }
        
            dropdownListTarget.css({left: `${x}px`, top: `${y}px`});
        }

        if ( !this.appOptions.isCorePDF )
            Common.Notifications.trigger('openDropdownList', obj);
        else Common.Notifications.trigger('openPdfDropdownList', obj);
    }

    onProcessRightsChange (data) {
        if (data && data.enabled === false) {
            const appOptions = this.props.storeAppOptions;
            const old_rights = appOptions.lostEditingRights;
            appOptions.changeEditingRights(!old_rights);
            this.api.asc_coAuthoringDisconnect();
            Common.Notifications.trigger('api:disconnect');

            if (!old_rights) {
                const { t } = this.props;
                const _t = t('Main', {returnObjects:true});

                f7.dialog.alert(
                    (!data.message) ? _t.warnProcessRightsChange : data.message,
                    _t.notcriticalErrorTitle,
                    () => { appOptions.changeEditingRights(false); }
                );
            }
        }
    }

    onDownloadAs(format) {
        const appOptions = this.props.storeAppOptions;

        if (!appOptions.canDownload && !appOptions.canDownloadOrigin) {
            const { t } = this.props;
            const _t = t('Main', {returnObjects:true});
            Common.Gateway.reportError(Asc.c_oAscError.ID.AccessDeny, _t.errorAccessDeny);
            return;
        }

        this._state.isFromGatewayDownloadAs = true;

        const result = resolveDownloadAs(format, this.document.fileType, {
            isForm: appOptions.isForm,
            canFeatureForms: appOptions.canFeatureForms,
        }, Asc.c_oAscFileType);

        if (result.action === 'origin') {
            const options = new Asc.asc_CDownloadOptions();
            options.asc_setIsDownloadEvent(true);
            options.asc_setIsSaveAs(true);
            this.api.asc_DownloadOrigin(options);
            return;
        }

        const options = new Asc.asc_CDownloadOptions(result.format, true);
        options.asc_setIsSaveAs(true);

        if (result.format) {
            if (result.needsTextParams) {
                options.asc_setTextParams(new AscCommon.asc_CTextParams(Asc.c_oAscTextAssociation.PlainLine));
            }
            this.api.asc_DownloadAs(options);
        } else {
            this.api.asc_DownloadOrigin(options);
        }
    }

    onDownloadUrl (url, fileType) {
        if (this._state.isFromGatewayDownloadAs) {
            Common.Gateway.downloadAs(url, fileType);
        }

        this._state.isFromGatewayDownloadAs = false;
    }

    onRequestClose () {
        const { t } = this.props;
        const _t = t("Toolbar", { returnObjects: true });

        if (this.api.isDocumentModified()) {
            this.api.asc_stopSaving();

            f7.dialog.create({
                title: _t.dlgLeaveTitleText,
                text: _t.dlgLeaveMsgText,
                verticalButtons: true,
                buttons : [
                    {
                        text: _t.leaveButtonText,
                        onClick: () => {
                            this.api.asc_undoAllChanges();
                            this.api.asc_continueSaving();
                            Common.Gateway.requestClose();
                        }
                    },
                    {
                        text: _t.stayButtonText,
                        bold: true,
                        onClick: () => {
                            this.api.asc_continueSaving();
                        }
                    }
                ]
            }).open();
        } else {
            Common.Gateway.requestClose();
        }
    }

    onUpdateVersion (callback) {
        const { t } = this.props;
        const _t = t('Main', {returnObjects:true});

        this.needToUpdateVersion = true;
        Common.Notifications.trigger('preloader:endAction', Asc.c_oAscAsyncActionType['BlockInteraction'], this.LoadingDocument);
        Common.Notifications.trigger('preloader:endAction', Asc.c_oAscAsyncActionType['BlockInteraction'], Asc.c_oAscAsyncAction['Open']);

        f7.dialog.alert(
            _t.errorUpdateVersion,
            _t.titleUpdateVersion,
            () => {
                Common.Gateway.updateVersion();
                if (callback) {
                    callback.call(this);
                }
                this.editorConfig && this.editorConfig.canUpdateVersion && Common.Notifications.trigger('preloader:beginAction', Asc.c_oAscAsyncActionType['BlockInteraction'], this.LoadingDocument);
            });
        Common.Notifications.trigger('api:disconnect');
    }

    onDocumentName () {
        this.updateWindowTitle(true);
    }

    updateWindowTitle (force) {
        const isModified = this.api.isDocumentModified();
        if (this._state.isDocModified !== isModified || force) {
            const title = this.defaultTitleText;

            if (window.document.title != title) {
                window.document.title = title;
            }

            this._isDocReady && (this._state.isDocModified !== isModified) && Common.Gateway.setDocumentModified(isModified);
            this._state.isDocModified = isModified;
        }
    }

    onPrint () {
        if (!this.props.storeAppOptions.canPrint) return;

        if (this.api)
            this.api.asc_Print();
        Common.component.Analytics.trackEvent('Print');
    }

    onPrintUrl (url) {
        if (this.iframePrint) {
            this.iframePrint.parentNode.removeChild(this.iframePrint);
            this.iframePrint = null;
        }

        if (!this.iframePrint) {
            this.iframePrint = document.createElement("iframe");
            this.iframePrint.id = "id-print-frame";
            this.iframePrint.style.display = 'none';
            this.iframePrint.style.visibility = "hidden";
            this.iframePrint.style.position = "fixed";
            this.iframePrint.style.right = "0";
            this.iframePrint.style.bottom = "0";
            document.body.appendChild(this.iframePrint);
            this.iframePrint.onload = function() {
                this.iframePrint.contentWindow.focus();
                this.iframePrint.contentWindow.print();
                this.iframePrint.contentWindow.blur();
                window.focus();
            };
        }

        if (url) {
            this.iframePrint.src = url;
        }
    }

    onExternalMessage (msg) {
        if (msg && msg.msg) {
            msg.msg = (msg.msg).toString();
            f7.notification.create({
                //title: uiApp.params.modalTitle,
                text: [msg.msg.charAt(0).toUpperCase() + msg.msg.substring(1)],
                closeButton: true
            }).open();

            Common.component.Analytics.trackEvent('External Error');
        }
    }

    onRunAutostartMacroses () {
        const config = this.props.storeAppOptions.config;
        const enable = !config.customization || (config.customization.macros !== false);
        if (enable) {
            const value = this.props.storeApplicationSettings.macrosMode;
            if (value === 1) {
                this.api.asc_runAutostartMacroses();
            } else if (value === 0) {
                const { t } = this.props;
                const _t = t('Main', {returnObjects:true});
                f7.dialog.create({
                    title: _t.notcriticalErrorTitle,
                    text: _t.textHasMacros,
                    content: `<div class="checkbox-in-modal">
                      <label class="checkbox">
                        <input type="checkbox" name="checkbox-show-macros" />
                        <i class="icon-checkbox"></i>
                      </label>
                      <span class="right-text">${_t.textRemember}</span>
                      </div>`,
                    buttons: [{
                        text: _t.textYes,
                        onClick: () => {
                            const dontshow = $$('input[name="checkbox-show-macros"]').prop('checked');
                            if (dontshow) {
                                this.props.storeApplicationSettings.changeMacrosSettings(1);
                                LocalStorage.setItem("de-mobile-macros-mode", 1);
                            }
                            setTimeout(() => {
                                this.api.asc_runAutostartMacroses();
                            }, 1);
                        }},
                        {
                            text: _t.textNo,
                            onClick: () => {
                                const dontshow = $$('input[name="checkbox-show-macros"]').prop('checked');
                                if (dontshow) {
                                    this.props.storeApplicationSettings.changeMacrosSettings(2);
                                    LocalStorage.setItem("de-mobile-macros-mode", 2);
                                }
                            }
                        }]
                }).open();
            }
        }
    }

    onMacrosPermissionRequest (url, callback) {
        if (url && callback) {
            this.stackMacrosRequests.push({url: url, callback: callback});
            if (this.stackMacrosRequests.length>1) {
                return;
            }
        } else if (this.stackMacrosRequests.length>0) {
            url = this.stackMacrosRequests[0].url;
            callback = this.stackMacrosRequests[0].callback;
        } else
            return;

        const value = this.props.storeApplicationSettings.macrosRequest;
        if (value>0) {
            callback && callback(value === 1);
            this.stackMacrosRequests.shift();
            this.onMacrosPermissionRequest();
        } else {
            const { t } = this.props;
            const _t = t('Main', {returnObjects:true});
            f7.dialog.create({
                title: _t.notcriticalErrorTitle,
                text: _t.textRequestMacros.replace('%1', url),
                cssClass: 'dlg-macros-request',
                content: `<div class="checkbox-in-modal">
                      <label class="checkbox">
                        <input type="checkbox" name="checkbox-show-macros" />
                        <i class="icon-checkbox"></i>
                      </label>
                      <span class="right-text">${_t.textRemember}</span>
                      </div>`,
                buttons: [{
                    text: _t.textYes,
                    onClick: () => {
                        const dontshow = $$('input[name="checkbox-show-macros"]').prop('checked');
                        if (dontshow) {
                            this.props.storeApplicationSettings.changeMacrosRequest(1);
                            LocalStorage.setItem("de-mobile-allow-macros-request", 1);
                        }
                        setTimeout(() => {
                            if (callback) callback(true);
                            this.stackMacrosRequests.shift();
                            this.onMacrosPermissionRequest();
                        }, 1);
                    }},
                    {
                        text: _t.textNo,
                        onClick: () => {
                            const dontshow = $$('input[name="checkbox-show-macros"]').prop('checked');
                            if (dontshow) {
                                this.props.storeApplicationSettings.changeMacrosRequest(2);
                                LocalStorage.setItem("de-mobile-allow-macros-request", 2);
                            }
                            setTimeout(() => {
                                if (callback) callback(false);
                                this.stackMacrosRequests.shift();
                                this.onMacrosPermissionRequest();
                            }, 1);
                        }
                    }]
            }).open();
        }
    }

    onRequestRefreshFile () {
        Common.Gateway.requestRefreshFile();
    }

    onRefreshFile (data) {
        if (data) {
            let docInfo = new Asc.asc_CDocInfo();
            if (data.document) {
                docInfo.put_Id(data.document.key);
                docInfo.put_Url(data.document.url);
                docInfo.put_Title(data.document.title);
                if (data.document.title) {
                    const storeDocumentInfo = this.props.storeDocumentInfo;
                    storeDocumentInfo.changeTitle(data.document.title);
                    this.document.title = data.document.title;
                    Common.Notifications.trigger('setdoctitle', data.document.title);
                }
                data.document.referenceData && docInfo.put_ReferenceData(data.document.referenceData);
            }
            if (data.editorConfig) {
                docInfo.put_CallbackUrl(data.editorConfig.callbackUrl);
            }
            if (data.token)
                docInfo.put_Token(data.token);

            const _userOptions = this.props.storeAppOptions.user;
            const _user = new Asc.asc_CUserInfo();
            _user.put_Id(_userOptions.id);
            _user.put_FullName(_userOptions.fullname);
            _user.put_IsAnonymousUser(_userOptions.anonymous);
            docInfo.put_UserInfo(_user);

            const _options = Object.assign({}, this.document.options, this.editorConfig.actionLink || {});
            docInfo.put_Options(_options);

            docInfo.put_Format(this.document.fileType);
            docInfo.put_Lang(this.editorConfig.lang);
            docInfo.put_Mode(this.editorConfig.mode);
            docInfo.put_Permissions(this.document.permissions);
            docInfo.put_DirectUrl(data.document && data.document.directUrl ? data.document.directUrl : this.document.directUrl);
            docInfo.put_VKey(data.document && data.document.vkey ?  data.document.vkey : this.document.vkey);
            docInfo.put_EncryptedInfo(data.editorConfig && data.editorConfig.encryptionKeys ? data.editorConfig.encryptionKeys : this.editorConfig.encryptionKeys);

            let enable = !this.editorConfig.customization || (this.editorConfig.customization.macros!==false);
            docInfo.asc_putIsEnabledMacroses(!!enable);
            enable = !this.editorConfig.customization || (this.editorConfig.customization.plugins!==false);
            docInfo.asc_putIsEnabledPlugins(!!enable);

            let type = /^(?:(pdf|djvu|xps|oxps))$/.exec(this.document.fileType);
            let coEditMode = (type && typeof type[1] === 'string') ? 'strict' :  // offline viewer for pdf|djvu|xps|oxps
                !(this.editorConfig.coEditing && typeof this.editorConfig.coEditing == 'object') ? 'fast' : // fast by default
                    this.editorConfig.mode === 'view' && this.editorConfig.coEditing.change!==false ? 'fast' : // if can change mode in viewer - set fast for using live viewer
                        this.editorConfig.coEditing.mode || 'fast';
            docInfo.put_CoEditingMode(coEditMode);
            this.api.asc_refreshFile(docInfo);
        }
    }

    render() {
        return (
            <Fragment>
                <LongActionsController />
                <ErrorController LoadingDocument={this.LoadingDocument}/>
                <CollaborationController />
                <ReviewController />
                <CommentsController />
                {EditorUIController.getEditCommentControllers && EditorUIController.getEditCommentControllers()}
                <ViewCommentsController />
                <PluginsController />
                <EncodingController />
                <DropdownListController />
                <AddFormImageController />
            </Fragment>
        )
    }

    componentDidMount() {
        Common.EditorApi = {get: () => this.api};
        this.initSdk();
    }
}

const translated = withTranslation()(MainController);
export {translated as MainController};
