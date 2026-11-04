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
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */
/**
 *  LocalSession.js
 *
 *  Wires Common.LocalSession.Session into the editor: receives the document
 *  bytes from api.js, registers the transport with sdkjs and reports progress
 *  and errors to the integrator through the Gateway.
 */

if (Common === undefined)
    var Common = {};

Common.Controllers = Common.Controllers || {};

define([
    'core',
    'common/main/lib/util/LocalSession'
], function () { 'use strict';

    var FONT_STYLE_SUFFIX = {indexR: '', indexB: '_Bold', indexI: '_Italic', indexBI: '_Bold_Italic'};
    var FONT_FILES_PATH = '../../../../fonts/';

    function loadConverterModule(baseUrl) {
        var url = baseUrl.replace(/\/?$/, '/') + 'converter.js';
        // The converter ships with the Document Server next to web-apps and is
        // not part of this bundle, hence the native import.
        return import(/* webpackIgnore: true */ url);
    }

    function productVersion() {
        var version = '{{PRODUCT_VERSION}}';
        if (Common.Views && Common.Views.About && Common.Views.About.prototype.txtVersionNum)
            version = Common.Views.About.prototype.txtVersionNum;
        var cropped = /^(\d+\.\d+\.\d+)(?:\.(\d+))?/.exec(version);
        return {
            buildVersion: cropped ? cropped[1] : version,
            buildNumber: cropped && cropped[2] ? parseInt(cropped[2]) : 0
        };
    }

    // Font files sdkjs has already resolved for this document, keyed the way x2t expects them
    function loadedFonts() {
        var fonts = {};
        var AscFonts = window.AscFonts;
        if (!AscFonts || !AscFonts.g_font_infos || !AscFonts.g_font_files)
            return fonts;
        AscFonts.g_font_infos.forEach(function (info) {
            if (!info || !info.NeedStyles) return;
            Object.keys(FONT_STYLE_SUFFIX).forEach(function (key) {
                var index = info[key];
                if (typeof index !== 'number' || index < 0) return;
                var file = AscFonts.g_font_files[index];
                if (!file || !file.Id) return;
                fonts[info.Name + FONT_STYLE_SUFFIX[key] + '.ttf'] = FONT_FILES_PATH + file.Id;
            });
        });
        return fonts;
    }

    Common.Controllers.LocalSession = Backbone.Controller.extend(_.extend({
        models: [],
        collections: [],
        views: [],

        initialize: function () {
            this.session = null;
            this.source = null;
            this.api = null;
        },

        onLaunch: function () {
            Common.Gateway.on('opendocumentsource', _.bind(this.onOpenDocumentSource, this));
        },

        onOpenDocumentSource: function (data) {
            this.source = data;
            this.session && this.session.setSource(data);
        },

        isSupported: function () {
            return !!(window.AscCommon && typeof AscCommon.setLocalSessionTransport === 'function');
        },

        /**
         * Registers the local transport with sdkjs. Must run before api.asc_setDocInfo.
         *
         * @param {Object} api
         * @param {Object} options {documentType, user, x2tUrl}
         * @returns {boolean} false when this SDK build has no local session support
         */
        start: function (api, options) {
            var me = this;
            options = options || {};
            this.api = api;

            if (!this.isSupported()) {
                Common.Gateway.reportError(Common.LocalSession.ERRORS.Load, this.errorNotSupported);
                Common.UI.warning({msg: this.errorNotSupported, buttons: []});
                return false;
            }

            this.session && this.session.destroy();
            this.session = new Common.LocalSession.Session({
                loadConverter: loadConverterModule,
                x2tUrl: options.x2tUrl,
                getFonts: loadedFonts,
                getVersion: productVersion,
                user: options.user ? {id: options.user.id, name: options.user.fullname} : {},
                documentType: options.documentType,
                onProgress: function (phase, percent) {
                    Common.Gateway.localSessionProgress(phase, percent);
                },
                onError: function (code, message) {
                    me.onSessionError(code, message);
                }
            });
            this.source && this.session.setSource(this.source);
            AscCommon.setLocalSessionTransport(this.session.getTransport());
            return true;
        },

        onSessionError: function (code, message) {
            var ERRORS = Common.LocalSession.ERRORS;
            var text = code === ERRORS.Load ? this.errorConverterLoad :
                       code === ERRORS.Unsupported ? this.errorUnsupportedFormat :
                       code === ERRORS.Memory ? this.errorOutOfMemory : this.errorConvert;
            console.error('Local session error ' + code + ': ' + message);
            Common.Gateway.reportError(code, text);
        },

        getBlob: function (url) {
            return this.session ? this.session.getBlob(url) : null;
        },

        getFileType: function (url) {
            return this.session ? this.session.getFileType(url) : null;
        },

        isActive: function () {
            return !!this.session && !this.session.isClosed();
        },

        stop: function () {
            if (!this.session) return;
            this.session.destroy();
            this.session = null;
            this.isSupported() && AscCommon.setLocalSessionTransport(null);
        },

        errorNotSupported: 'This editor build cannot open documents without a Document Server.',
        errorConverterLoad: 'The document converter could not be loaded.',
        errorConvert: 'The document could not be converted in the browser.',
        errorUnsupportedFormat: 'This file format cannot be opened without a Document Server.',
        errorOutOfMemory: 'The document is too large to be opened in the browser.'
    }, Common.Controllers.LocalSession || {}));
});
