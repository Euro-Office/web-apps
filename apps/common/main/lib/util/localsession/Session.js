/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Session: the state of one local session and the transport object sdkjs
// connects to (AscCommon.setLocalSessionTransport). Messages from sdkjs are
// answered by Protocol or relayed to the host page by Relay; Media and
// Conversion serve the document files.

define([
    './helpers',
    './Media',
    './Conversion',
    './Protocol',
    './Relay'
], function (helpers, Media, Conversion, Protocol, Relay) { 'use strict';

    var noop = helpers.noop,
        defer = helpers.defer,
        fileExtension = helpers.fileExtension,
        toUint8Array = helpers.toUint8Array,
        changeRecords = helpers.changeRecords;

    /**
     * @param {Object} options
     * @param {function(string): Promise} options.loadConverter   loads the converter module, resolves to {createConverter}
     * @param {string} [options.x2tUrl]                             base url of the x2t directory
     * @param {function(): Object} [options.getFonts]               fonts map for exports, see converter contract
     * @param {function(): Object} [options.getThemes]              theme files for exports
     * @param {function(): Object} [options.getVersion]             {buildVersion, buildNumber} reported to sdkjs
     * @param {Object} [options.user]                               {id, name}
     * @param {string} [options.documentType]                       word | cell | slide | pdf
     * @param {function(string, number)} [options.onProgress]
     * @param {function(number, string)} [options.onError]          receives the integrator error codes (-100..-103)
     * @param {function(Blob): string} [options.createObjectURL]
     * @param {function(string)} [options.revokeObjectURL]
     * @param {string} [options.transport]                          'self' (default): answer like a single-user DocService;
     *                                                              'host': relay co-editing messages to options.onHostMessage
     * @param {boolean} [options.editing]                           the user edits (participant is not a viewer)
     * @param {number} [options.indexUser]                          connection index, sdkjs's user id is user.id + indexUser
     * @param {Array} [options.participants]                        initial participants (DocService shape) for the auth reply
     * @param {string} [options.saveFormat]                         format a user save exports to (docx, xlsx...)
     * @param {function(Object)} [options.onHostMessage]            'host' transport: a message sdkjs sent
     * @param {function(string): boolean} [options.onSaveRequest]   a user save: start the export (asc_DownloadAs) to the
     *                                                              given format, return false when it cannot start
     * @param {function(Blob, string)} [options.onSave]             the export of a user save is ready
     * @param {function(string, Blob)} [options.onMedia]            an image the user inserted was stored as session media
     * @param {function(string, string)} [options.registerImageUrl] makes a media url known to sdkjs (g_oDocumentUrls)
     * @param {function(): number} [options.now]
     */
    function Session(options) {
        options = options || {};
        this.loadConverter = options.loadConverter;
        this.x2tUrl = options.x2tUrl || '../../../../x2t/';
        this.getFonts = options.getFonts || function () { return undefined; };
        this.getThemes = options.getThemes || function () { return undefined; };
        this.getVersion = options.getVersion || function () { return {buildVersion: '', buildNumber: 0}; };
        this.user = options.user || {};
        this.documentType = options.documentType || 'word';
        this.onProgress = options.onProgress || noop;
        this.onError = options.onError || noop;
        this.createObjectURL = options.createObjectURL || function (blob) { return URL.createObjectURL(blob); };
        this.revokeObjectURL = options.revokeObjectURL || function (url) { URL.revokeObjectURL(url); };
        this.transportType = options.transport === 'host' ? 'host' : 'self';
        this.editing = !!options.editing;
        this.indexUser = (typeof options.indexUser === 'number' && options.indexUser >= 0 && options.indexUser % 1 === 0) ? options.indexUser : 0;
        this.initialParticipants = Array.isArray(options.participants) ? options.participants : null;
        this.saveFormat = options.saveFormat || null;
        this.onHostMessage = options.onHostMessage || noop;
        this.onSaveRequest = options.onSaveRequest || null;
        this.onSave = options.onSave || noop;
        this.onMedia = options.onMedia || noop;
        this.registerImageUrl = options.registerImageUrl || this.registerImageUrl;
        this.now = options.now || function () { return Date.now(); };

        this.sessionId = 'local-' + Math.random().toString(16).slice(2);
        this.source = null;
        this._sourceWaiters = [];
        this._converterPromise = null;
        this._converter = null;
        this._documentUrlsPromise = null;
        this.urls = {};         // name -> object url ("Editor.bin", "media/image1.png", ...)
        this.mediaBytes = {};   // media name -> Uint8Array, needed again for exports
        this.blobs = {};        // object url -> {blob, fileType}
        this.changes = [];      // change records since the source was created, as DocsCoServer keeps them
        this.locks = {};        // 'self' transport: lock id -> {time, user, block}
        this._lastTime = 0;
        this._mediaCount = 0;
        this._documentOpened = false;
        this._hostQueue = [];   // 'host' transport: messages for sdkjs that arrived before the document was opened
        this._pendingSave = null;
        this.handlers = null;
        this.closed = false;
        this.transport = this._createTransport();
    }

    Session.ERRORS = helpers.ERRORS;

    Object.assign(Session.prototype, Media.methods, Conversion.methods, Protocol.methods, Relay.methods);

    Session.prototype.getTransport = function () {
        return this.transport;
    };

    /**
     * @param {Object} source {buffer: ArrayBuffer, name: string, fileType?: string, format?: 'bin',
     *                         media?: {name: Blob|ArrayBuffer}, changes?: Array}
     */
    Session.prototype.setSource = function (source) {
        if (!source || !source.buffer) return;
        this.source = {
            bytes: toUint8Array(source.buffer),
            name: source.name || ('document.' + (source.fileType || '')),
            fileType: (source.fileType || fileExtension(source.name) || '').toLowerCase(),
            format: source.format === 'bin' ? 'bin' : '',
            media: source.media || null
        };
        this.changes = changeRecords(source.changes, this.sessionId, this._nextTime(), this.getUserId(), this._userIdOriginal());
        var waiters = this._sourceWaiters;
        this._sourceWaiters = [];
        waiters.forEach(function (resolve) { resolve(); });
    };

    Session.prototype._waitSource = function () {
        var me = this;
        if (this.source) return Promise.resolve(this.source);
        return new Promise(function (resolve) {
            me._sourceWaiters.push(function () { resolve(me.source); });
        });
    };

    Session.prototype.getChanges = function () {
        return this.changes.slice();
    };

    Session.prototype.isEditing = function () {
        return this.editing;
    };

    Session.prototype.getBlob = function (url) {
        var entry = this.blobs[url];
        return entry ? entry.blob : null;
    };

    Session.prototype.getFileType = function (url) {
        var entry = this.blobs[url];
        return entry ? entry.fileType : null;
    };

    Session.prototype.isClosed = function () {
        return this.closed;
    };

    Session.prototype.destroy = function () {
        if (this.closed) return;
        this.closed = true;
        var me = this;
        var revoked = {};
        var revokeOnce = function (url) {
            if (!url || revoked[url]) return;
            revoked[url] = true;
            me._revoke(url);
        };
        Object.keys(this.urls).forEach(function (name) { revokeOnce(me.urls[name]); });
        Object.keys(this.blobs).forEach(revokeOnce);
        this.urls = {};
        this.blobs = {};
        this.mediaBytes = {};
        this.changes = [];
        this.locks = {};
        this._hostQueue = [];
        this._pendingSave = null;
        if (this._converter && typeof this._converter.terminate === 'function') {
            try { this._converter.terminate(); } catch (e) {}
        }
        this._converter = null;
        this._converterPromise = null;
        // sdkjs closes its own side (CLocalTransportSocket.close) before calling transport.close(),
        // so nothing is reported back to the handlers here
        this.handlers = null;
    };

    Session.prototype._revoke = function (url) {
        if (!url) return;
        try { this.revokeObjectURL(url); } catch (e) {}
    };

    Session.prototype._registerBlob = function (blob, fileType) {
        var url = this.createObjectURL(blob);
        this.blobs[url] = {blob: blob, fileType: fileType};
        return url;
    };

    Session.prototype._emit = function (message) {
        if (this.closed || !this.handlers) return;
        this.handlers.onMessage(message);
    };

    Session.prototype._fail = function (code, message) {
        this.onError(code, message);
    };

    // Strictly increasing, so a user save is always newer than the changes before it (the
    // DocService rounds to seconds; sdkjs only compares these times)
    Session.prototype._nextTime = function () {
        this._lastTime = Math.max(this.now(), this._lastTime + 1);
        return this._lastTime;
    };

    Session.prototype._userIdOriginal = function () {
        return this.user.id !== undefined && this.user.id !== null ? String(this.user.id) : 'local-user';
    };

    // The id sdkjs uses for this user: user id + indexUser (DocsCoApi._userId)
    Session.prototype.getUserId = function () {
        return this._userIdOriginal() + this.indexUser;
    };

    Session.prototype._createTransport = function () {
        var me = this;
        return {
            connect: function (handlers) {
                me.handlers = handlers;
                defer(function () {
                    if (me.closed || me.handlers !== handlers) return;
                    handlers.onOpen && handlers.onOpen();
                    me._emit(me._licenseMessage());
                });
            },
            send: function (message) {
                me._onSdkMessage(message);
            },
            close: function () {
                me.destroy();
            },
            convert: function (request, callback) {
                me._convertForDownload(request, callback);
            },
            uploadImages: function (files, callback) {
                me._uploadImages(files, callback);
            },
            uploadImageUrls: function (urls, callback) {
                me._uploadImageUrls(urls, callback);
            }
        };
    };

    Session.prototype._onSdkMessage = function (message) {
        if (!message || this.closed) return;
        // answered here with both transports
        switch (message.type) {
            case 'auth':
                this._onAuth(message);
                return;
            case 'openDocument':
                this._onOpenDocumentRequest(message);
                return;
            case 'forceSaveStart':
                // saving exports in this frame, see startUserSave
                this.startUserSave();
                return;
            case 'rpc':
                // imgurls from the session media; there is no server for the other calls
                this._onRpc(message);
                return;
            case 'close':
                this.transportType === 'host' && this.onHostMessage(message);
                this.destroy();
                return;
        }
        if (this.transportType === 'host') {
            this.onHostMessage(message);
            return;
        }
        this._answerSingleUser(message);
    };

    return Session;
});
