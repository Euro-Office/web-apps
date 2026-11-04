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
 *  A local session replaces the DocService for a single viewer: the document
 *  bytes come from the host page, x2t runs in the browser (WebAssembly) and the
 *  sdkjs co-editing socket is served by the transport object built here.
 *
 *  This file has no dependencies on the application bootstrap so it can be
 *  unit tested; the Backbone controller lives in controller/LocalSession.js.
 *  See DocumentServer/docs/client-only-editor-plan.md for the contract.
 */

if (Common === undefined)
    var Common = {};

Common.LocalSession = Common.LocalSession || {};

define([], function () { 'use strict';

    var ERRORS = {
        Load: -100,
        Convert: -101,
        Unsupported: -102,
        Memory: -103
    };

    var LICENSE_SUCCESS = 3;        // Asc.c_oLicenseResult.Success
    var RIGHTS_EDIT = 1;            // Asc.c_oRights.Edit
    var LICENSE_MODE_NONE = 0;      // Asc.c_oLicenseMode.None

    var VIEWER_FORMATS = /^(pdf|djvu|xps|oxps)$/i;

    // Asc.c_oAscFileType values the download path may hand over instead of an extension
    var FILE_TYPE_EXTENSIONS = {
        0x0041: 'docx', 0x0043: 'odt', 0x0044: 'rtf', 0x0045: 'txt', 0x0046: 'html', 0x0048: 'epub',
        0x0049: 'fb2', 0x004c: 'dotx', 0x004e: 'fodt', 0x005c: 'md',
        0x0101: 'xlsx', 0x0103: 'ods', 0x0104: 'csv', 0x0106: 'xltx', 0x0109: 'fods',
        0x0081: 'pptx', 0x0083: 'odp', 0x0087: 'potx', 0x0089: 'fodp',
        0x0201: 'pdf', 0x0209: 'pdf', 0x0203: 'djvu', 0x0204: 'xps'
    };

    var MIME_TYPES = {
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dotx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        xltx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        potx: 'application/vnd.openxmlformats-officedocument.presentationml.template',
        odt: 'application/vnd.oasis.opendocument.text',
        ods: 'application/vnd.oasis.opendocument.spreadsheet',
        odp: 'application/vnd.oasis.opendocument.presentation',
        pdf: 'application/pdf',
        rtf: 'application/rtf',
        txt: 'text/plain',
        csv: 'text/csv',
        html: 'text/html',
        epub: 'application/epub+zip',
        fb2: 'application/x-fictionbook+xml',
        md: 'text/markdown'
    };

    function noop() {}

    function defer(fn) {
        setTimeout(fn, 0);
    }

    function fileExtension(name) {
        var match = /\.([^.\/\\]+)$/.exec(name || '');
        return match ? match[1].toLowerCase() : '';
    }

    function toUint8Array(data) {
        if (!data)
            return new Uint8Array(0);
        if (data instanceof Uint8Array)
            return data;
        if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer)
            return new Uint8Array(data);
        if (ArrayBuffer.isView(data))
            return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        if (typeof data === 'string')
            return new TextEncoder().encode(data);
        return new Uint8Array(0);
    }

    function blobToArrayBuffer(blob) {
        if (typeof blob.arrayBuffer === 'function')
            return blob.arrayBuffer();
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = function () { reject(reader.error); };
            reader.readAsArrayBuffer(blob);
        });
    }

    function errorCode(error) {
        var code = error && error.code;
        if (code === 'load') return ERRORS.Load;
        if (code === 'unsupported') return ERRORS.Unsupported;
        if (code === 'memory') return ERRORS.Memory;
        return ERRORS.Convert;
    }

    function errorMessage(error) {
        if (!error) return '';
        if (typeof error === 'string') return error;
        return error.message || String(error);
    }

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

        this.sessionId = 'local-' + Math.random().toString(16).slice(2);
        this.source = null;
        this._sourceWaiters = [];
        this._converterPromise = null;
        this._converter = null;
        this._documentUrlsPromise = null;
        this.urls = {};         // name -> object url ("Editor.bin", "media/image1.png", ...)
        this.mediaBytes = {};   // media name -> Uint8Array, needed again for exports
        this.blobs = {};        // object url -> {blob, fileType}
        this.handlers = null;
        this.closed = false;
        this.transport = this._createTransport();
    }

    Session.ERRORS = ERRORS;

    Session.prototype.getTransport = function () {
        return this.transport;
    };

    /**
     * @param {Object} source {buffer: ArrayBuffer, name: string, fileType?: string, media?: {name: Blob|ArrayBuffer}}
     */
    Session.prototype.setSource = function (source) {
        if (!source || !source.buffer) return;
        this.source = {
            bytes: toUint8Array(source.buffer),
            name: source.name || ('document.' + (source.fileType || '')),
            fileType: (source.fileType || fileExtension(source.name) || '').toLowerCase(),
            media: source.media || null
        };
        var waiters = this._sourceWaiters;
        this._sourceWaiters = [];
        waiters.forEach(function (resolve) { resolve(); });
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
        if (this._converter && typeof this._converter.terminate === 'function') {
            try { this._converter.terminate(); } catch (e) {}
        }
        this._converter = null;
        this._converterPromise = null;
        var handlers = this.handlers;
        this.handlers = null;
        handlers && handlers.onClose && handlers.onClose(true);
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

    Session.prototype._licenseMessage = function () {
        var version = this.getVersion() || {};
        return {
            type: 'license',
            license: {
                type: LICENSE_SUCCESS,
                mode: LICENSE_MODE_NONE,
                rights: RIGHTS_EDIT,
                light: false,
                branding: true,
                customization: true,
                buildVersion: version.buildVersion || '',
                buildNumber: version.buildNumber || 0,
                liveViewerSupport: false,
                protectionSupport: false,
                isAnonymousSupport: true
            }
        };
    };

    Session.prototype._participants = function () {
        var id = this.user.id !== undefined && this.user.id !== null ? String(this.user.id) : 'local-user';
        return [{
            id: id + '0',
            idOriginal: id,
            username: this.user.name || '',
            indexUser: 0,
            connectionId: this.sessionId,
            isCloseCoAuthoring: false,
            view: true
        }];
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
            }
        };
    };

    Session.prototype._onSdkMessage = function (message) {
        if (!message || this.closed) return;
        switch (message.type) {
            case 'auth':
                this._onAuth(message);
                break;
            case 'rpc':
                this._onRpc(message);
                break;
            case 'openDocument':
                this._onOpenDocumentRequest(message);
                break;
            case 'isSaveLock':
                this._emit({type: 'saveLock', saveLock: false});
                break;
            case 'close':
                this.destroy();
                break;
            default:
                // getLock, releaseLock, saveChanges, cursor, extendSession, clientLog, getMessages...
                // have no meaning without a DocService; a local session is view-only.
                break;
        }
    };

    Session.prototype._onAuth = function (message) {
        var me = this;
        var version = this.getVersion() || {};
        var now = Date.now();
        this._getDocumentUrls(message.openCmd).then(function (urls) {
            if (me.closed) return;
            me._emit({type: 'authChanges', changes: []});
            me._emit({
                type: 'auth',
                result: 1,
                sessionId: me.sessionId,
                sessionTimeConnect: now,
                participants: me._participants(),
                locks: [],
                changes: [],
                changesIndex: 0,
                indexUser: 0,
                buildVersion: version.buildVersion || '',
                buildNumber: version.buildNumber || 0,
                licenseType: LICENSE_SUCCESS,
                openedAt: now
            });
            me._emit({type: 'documentOpen', data: {type: 'open', status: 'ok', openedAt: now, data: urls}});
            me.onProgress('open', 100);
        }, function (error) {
            if (me.closed) return;
            me._fail(errorCode(error), errorMessage(error));
            me._emit({type: 'documentOpen', data: {type: 'open', status: 'err', data: -1}});
        });
    };

    Session.prototype._onOpenDocumentRequest = function (message) {
        var me = this;
        var request = message.message || {};
        if (request.c === 'imgurls') {
            this._emit({type: 'documentOpen', data: {type: 'imgurls', status: 'ok', data: {urls: this._imageUrls(request.data), error: 0}}});
            return;
        }
        // reopen with advanced options (encoding, delimiter...): rerun the conversion with the same source
        this._documentUrlsPromise = null;
        this._getDocumentUrls(request).then(function (urls) {
            me._emit({type: 'documentOpen', data: {type: 'reopen', status: 'ok', openedAt: Date.now(), data: urls}});
        }, function (error) {
            me._fail(errorCode(error), errorMessage(error));
            me._emit({type: 'documentOpen', data: {type: 'reopen', status: 'err', data: -1}});
        });
    };

    Session.prototype._onRpc = function (message) {
        var request = message.data || {};
        var response = {status: 'err', data: -1};
        if (request.c === 'imgurls') {
            var me = this;
            response = {
                status: 'ok',
                data: (request.data || []).map(function (name) { return me._imageUrl(name); })
            };
        }
        this._emit({type: 'rpc', responseKey: message.responseKey, data: response});
    };

    Session.prototype._imageUrl = function (name) {
        return this.urls['media/' + name] || this.urls[name] || name;
    };

    Session.prototype._imageUrls = function (names) {
        var me = this;
        return (names || []).map(function (name) {
            return {path: name, url: me._imageUrl(name)};
        });
    };

    Session.prototype._waitSource = function () {
        var me = this;
        if (this.source) return Promise.resolve(this.source);
        return new Promise(function (resolve) {
            me._sourceWaiters.push(function () { resolve(me.source); });
        });
    };

    Session.prototype._getConverter = function () {
        var me = this;
        if (this._converterPromise) return this._converterPromise;
        if (typeof this.loadConverter !== 'function') {
            return Promise.reject({code: 'load', message: 'No converter loader configured'});
        }
        this.onProgress('load', 0);
        this._converterPromise = Promise.resolve().then(function () {
            return me.loadConverter(me.x2tUrl);
        }).then(function (module) {
            var factory = module && (module.createConverter || (module.default && module.default.createConverter));
            if (typeof factory !== 'function')
                throw {code: 'load', message: 'converter.js does not export createConverter'};
            return factory({baseUrl: me.x2tUrl});
        }).then(function (converter) {
            me._converter = converter;
            me.onProgress('load', 100);
            return converter;
        }, function (error) {
            me._converterPromise = null;
            throw (error && error.code) ? error : {code: 'load', message: errorMessage(error)};
        });
        return this._converterPromise;
    };

    Session.prototype._readMedia = function (media) {
        var me = this;
        var names = media ? Object.keys(media) : [];
        return Promise.all(names.map(function (name) {
            var value = media[name];
            var read = (typeof Blob !== 'undefined' && value instanceof Blob) ? blobToArrayBuffer(value) : Promise.resolve(value);
            return read.then(function (buffer) {
                me._addMedia(name, toUint8Array(buffer));
            });
        }));
    };

    Session.prototype._addMedia = function (name, bytes) {
        var blob = new Blob([bytes]);
        var url = this.createObjectURL(blob);
        this.mediaBytes[name] = bytes;
        this.urls['media/' + name] = url;
        this.urls[name] = url;
    };

    Session.prototype._getDocumentUrls = function (openCmd) {
        var me = this;
        if (this._documentUrlsPromise) return this._documentUrlsPromise;
        this._documentUrlsPromise = this._waitSource().then(function (source) {
            return me._readMedia(source.media).then(function () { return source; });
        }).then(function (source) {
            var fileType = source.fileType || (openCmd && openCmd.format) || '';
            if (VIEWER_FORMATS.test(fileType)) {
                // sdkjs renders these natively, no conversion needed
                var originUrl = me.createObjectURL(new Blob([source.bytes], {type: MIME_TYPES[fileType] || 'application/octet-stream'}));
                me.urls['origin.' + fileType] = originUrl;
                return me.urls;
            }
            return me._getConverter().then(function (converter) {
                me.onProgress('convert', 0);
                return converter.convert({
                    data: source.bytes,
                    fileName: source.name,
                    to: 'bin',
                    type: me.documentType,
                    options: {noBase64: !openCmd || openCmd.nobase64 !== false}
                });
            }).then(function (result) {
                if (!result || !result.data)
                    throw {code: 'convert', message: 'Conversion produced no data'};
                me.urls['Editor.bin'] = me.createObjectURL(new Blob([result.data]));
                var media = result.media || {};
                Object.keys(media).forEach(function (name) {
                    me._addMedia(name, toUint8Array(media[name]));
                });
                me.onProgress('convert', 100);
                return me.urls;
            });
        });
        this._documentUrlsPromise.catch(function () {
            me._documentUrlsPromise = null;
        });
        return this._documentUrlsPromise;
    };

    Session.prototype._convertForDownload = function (request, callback) {
        var me = this;
        request = request || {};
        var format = request.format || FILE_TYPE_EXTENSIONS[request.fileType];
        if (request.isPrint)
            format = 'pdf';
        if (!format) {
            this._fail(ERRORS.Unsupported, 'Unsupported export format');
            callback({status: 'err', error: ERRORS.Unsupported});
            return;
        }
        format = String(format).toLowerCase();
        var noBase64 = !!(request.options && request.options.nobase64);
        this._getConverter().then(function (converter) {
            return converter.convert({
                data: toUint8Array(request.data),
                fileName: 'document.bin',
                to: format,
                type: me.documentType,
                fonts: me.getFonts(),
                themes: me.getThemes(),
                media: me.mediaBytes,
                options: {noBase64: noBase64, title: request.title, isPrint: !!request.isPrint}
            });
        }).then(function (result) {
            if (me.closed) return;
            if (!result || !result.data)
                throw {code: 'convert', message: 'Conversion produced no data'};
            var blob = new Blob([result.data], {type: MIME_TYPES[format] || 'application/octet-stream'});
            callback({status: 'ok', data: me._registerBlob(blob, format), filetype: format});
        }).catch(function (error) {
            if (me.closed) return;
            me._fail(errorCode(error), errorMessage(error));
            callback({status: 'err', error: errorCode(error)});
        });
    };

    Common.LocalSession.Session = Session;
    Common.LocalSession.ERRORS = ERRORS;
    Common.LocalSession.fileExtension = fileExtension;

    return Common.LocalSession;
});
