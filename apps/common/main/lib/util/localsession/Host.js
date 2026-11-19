/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Host: wires a Session into an editor app (desktop or mobile). Kept free of
// Backbone and React so every app shell can use it.

define([
    './helpers',
    './Conversion',
    './Session'
], function (helpers, Conversion, Session) { 'use strict';

    var ERRORS = helpers.ERRORS,
        saveFormat = helpers.saveFormat,
        restrictPermissions = helpers.restrictPermissions;

    var DEFAULT_MESSAGES = {
        notSupported: 'This editor build cannot open documents without a Document Server.',
        converterLoad: 'The document converter could not be loaded.',
        convert: 'The document could not be converted in the browser.',
        unsupportedFormat: 'This file format cannot be opened without a Document Server.',
        outOfMemory: 'The document is too large to be opened in the browser.'
    };

    function productVersion() {
        var version = '{{PRODUCT_VERSION}}';
        var Common = window.Common;
        if (Common && Common.Views && Common.Views.About && Common.Views.About.prototype.txtVersionNum)
            version = Common.Views.About.prototype.txtVersionNum;
        var cropped = /^(\d+\.\d+\.\d+)(?:\.(\d+))?/.exec(version);
        return {
            buildVersion: cropped ? cropped[1] : version,
            buildNumber: cropped && cropped[2] ? parseInt(cropped[2]) : 0
        };
    }

    /**
     * @param {Object} options
     *   gateway   Common.Gateway (on, reportError, localSessionProgress, sessionMessage,
     *             localSessionSave, localSessionMedia)
     *   messages  localized texts, see DEFAULT_MESSAGES
     *   onError   function (code, text), e.g. to show a dialog
     *   loadConverter, getFonts, getVersion  overrides for tests
     */
    function Host(options) {
        options = options || {};
        this.gateway = options.gateway;
        this.messages = Object.assign({}, DEFAULT_MESSAGES, options.messages || {});
        this.onError = options.onError || function () {};
        this.loadConverter = options.loadConverter || Conversion.loadConverterModule;
        this.getFonts = options.getFonts || Conversion.loadedFonts;
        this.getVersion = options.getVersion || productVersion;
        this.session = null;
        this.source = null;
        this.api = null;
        this._early = [];   // host messages and media that arrived before start
    }

    Host.isSupported = function () {
        var AscCommon = window.AscCommon;
        return !!(AscCommon && typeof AscCommon.setLocalSessionTransport === 'function');
    };

    // Call at startup: api.js posts the bytes before the document is opened.
    Host.prototype.listen = function () {
        var me = this;
        this.gateway.on('opendocumentsource', function (data) {
            me.source = data;
            me.session && me.session.setSource(data);
        });
        this.gateway.on('sessionmessage', function (message) {
            me.session ? me.session.receiveHostMessage(message) : me._early.push({message: message});
        });
        this.gateway.on('addsessionmedia', function (media) {
            me.session ? me.session.addMedia(media) : me._early.push({media: media});
        });
    };

    /**
     * Registers the local transport with sdkjs. Must run before api.asc_setDocInfo.
     * @param {Object} options {documentType, user: {id, fullname}, x2tUrl, api, mode: 'view'|'edit', fileType,
     *                          session: editorConfig.session ({transport, indexUser, participants})}
     * @returns {boolean} false when this SDK build has no local session support
     */
    Host.prototype.start = function (options) {
        var me = this;
        options = options || {};
        if (!Host.isSupported()) {
            this._report(ERRORS.Load, this.messages.notSupported);
            return false;
        }
        var editing = options.mode === 'edit';
        var config = options.session || {};
        this.stop();
        this.api = options.api || null;
        this.session = new Session({
            loadConverter: this.loadConverter,
            x2tUrl: options.x2tUrl,
            getFonts: this.getFonts,
            getVersion: this.getVersion,
            user: options.user ? {id: options.user.id, name: options.user.fullname} : {},
            documentType: options.documentType,
            transport: config.transport,
            indexUser: config.indexUser,
            participants: config.participants,
            editing: editing,
            saveFormat: editing ? saveFormat(options.fileType, options.documentType) : null,
            onProgress: function (phase, percent) {
                me.gateway.localSessionProgress(phase, percent);
            },
            onError: function (code, message) {
                console.error('Local session error ' + code + ': ' + message);
                me._report(code, me._messageFor(code));
            },
            onHostMessage: function (message) {
                me.gateway.sessionMessage(message);
            },
            onSaveRequest: function (format) {
                return me._exportForSave(format);
            },
            onSave: function (blob, fileType) {
                me.gateway.localSessionSave(blob, fileType);
            },
            onMedia: function (name, blob) {
                me.gateway.localSessionMedia(name, blob);
            }
        });
        this.source && this.session.setSource(this.source);
        editing && this._watchUserSaves();
        window.AscCommon.setLocalSessionTransport(this.session.getTransport());
        var early = this._early;
        this._early = [];
        early.forEach(function (item) {
            item.message ? me.session.receiveHostMessage(item.message) : me.session.addMedia(item.media);
        });
        return true;
    };

    /**
     * Starts the session for the document an editor is about to open: restricts the merged
     * permissions (and makes them doc.permissions), then registers the transport (see start).
     * @param {Object} options {api, documentType, user, editorConfig, doc, permissions}
     * @returns {boolean} see start
     */
    Host.prototype.openDocument = function (options) {
        var config = options.editorConfig || {};
        var doc = options.doc;
        doc.permissions = restrictPermissions(options.permissions, config);
        return this.start({
            api: options.api,
            documentType: options.documentType,
            user: options.user,
            x2tUrl: config.session && config.session.x2tUrl,
            mode: config.mode,
            session: config.session,
            fileType: doc.fileType
        });
    };

    // Every user save goes through api.asc_Save without the isAutoSave flag: the save button,
    // File > Save, Ctrl+S in the document (sdkjs calls this.Api.asc_Save(false)). The original
    // still sends the changes; the export follows even when nothing changed. Autosave passes
    // true and exports nothing.
    Host.prototype._watchUserSaves = function () {
        var me = this, api = this.api;
        if (!api || typeof api.asc_Save !== 'function') return;
        var hadOwn = Object.prototype.hasOwnProperty.call(api, 'asc_Save');
        var original = api.asc_Save;
        api.asc_Save = function (isAutoSave) {
            var result = original.apply(this, arguments);
            !isAutoSave && me.session && me.session.startUserSave();
            return result;
        };
        this._restoreSave = function () {
            if (hadOwn) api.asc_Save = original;
            else delete api.asc_Save;
        };
    };

    // Exports the open document through sdkjs (transport.convert); the result is picked up by
    // the session as the file of the pending save.
    Host.prototype._exportForSave = function (format) {
        var Asc = window.Asc;
        var fileType = Asc && Asc.c_oAscFileType && Asc.c_oAscFileType[String(format).toUpperCase()];
        if (!this.api || fileType === undefined || typeof Asc.asc_CDownloadOptions !== 'function')
            return false;
        var options = new Asc.asc_CDownloadOptions(fileType);
        options.asc_setIsDownloadEvent(true);
        this.api.asc_DownloadAs(options);
        return true;
    };

    Host.prototype._messageFor = function (code) {
        return code === ERRORS.Load ? this.messages.converterLoad :
               code === ERRORS.Unsupported ? this.messages.unsupportedFormat :
               code === ERRORS.Memory ? this.messages.outOfMemory : this.messages.convert;
    };

    Host.prototype._report = function (code, text) {
        this.gateway.reportError(code, text);
        this.onError(code, text);
    };

    Host.prototype.getBlob = function (url) {
        return this.session ? this.session.getBlob(url) : null;
    };

    Host.prototype.getFileType = function (url) {
        return this.session ? this.session.getFileType(url) : null;
    };

    // Hands a download to the integrator, as the file itself when the url is a session export
    Host.prototype.downloadAs = function (url, fileType) {
        var blob = this.getBlob(url);
        blob ? this.gateway.downloadAsBlob(blob, fileType) : this.gateway.downloadAs(url, fileType);
    };

    Host.prototype.isActive = function () {
        return !!this.session && !this.session.isClosed();
    };

    Host.prototype.stop = function () {
        this._restoreSave && this._restoreSave();
        this._restoreSave = null;
        if (!this.session) return;
        this.session.destroy();
        this.session = null;
        this.api = null;
        Host.isSupported() && window.AscCommon.setLocalSessionTransport(null);
    };

    return Host;
});
