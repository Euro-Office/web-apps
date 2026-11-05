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
 *  A local session replaces the DocService: the document bytes come from the
 *  host page, x2t runs in the browser (WebAssembly) and the sdkjs co-editing
 *  socket is served by the transport object built here. With the 'self'
 *  transport the session answers like a DocService with a single editor; with
 *  the 'host' transport the co-editing messages are relayed to the host page,
 *  which arbitrates locks and changes between its users.
 *
 *  This file has no dependencies on the application bootstrap so it can be
 *  unit tested; the Backbone controller lives in controller/LocalSession.js.
 *  See DocumentServer/docs/client-only-editor-plan.md for the contract.
 */

// window.Common, not `var Common`: the mobile apps bundle this file as a
// module, where a var would stay local and Common.LocalSession never global.
if (window.Common === undefined)
    window.Common = {};

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

    var SERVER_NO_ERROR = 0;        // AscCommon.c_oAscServerCommandErrors.NoError
    var SERVER_UNKNOWN_ERROR = 3;   // AscCommon.c_oAscServerCommandErrors.UnknownError
    var FORCE_SAVE_BUTTON = 1;      // AscCommon.c_oAscForceSaveTypes.Button
    var UPLOAD_NO_ERROR = 0;        // Asc.c_oAscError.ID.No
    var UPLOAD_FILE_COUNT = -11;    // Asc.c_oAscError.ID.UplImageFileCount
    var UPLOAD_URL = -13;           // Asc.c_oAscError.ID.UplImageUrl

    var VIEWER_FORMATS = /^(pdf|djvu|xps|oxps)$/i;

    // Formats the converter can write back; anything else is saved in the editor's default format
    var SAVE_FORMATS = {
        word: /^(docx|docm|dotx|dotm|odt|ott|rtf)$/,
        cell: /^(xlsx|xlsm|xltx|xltm|ods|ots)$/,
        slide: /^(pptx|pptm|ppsx|ppsm|potx|potm|odp|otp)$/
    };
    var DEFAULT_SAVE_FORMATS = {word: 'docx', cell: 'xlsx', slide: 'pptx'};

    var IMAGE_TYPES = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp',
        svg: 'image/svg+xml', webp: 'image/webp', tif: 'image/tiff', tiff: 'image/tiff',
        emf: 'image/emf', wmf: 'image/wmf'
    };

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

    function mimeType(name) {
        return IMAGE_TYPES[fileExtension(name)] || '';
    }

    function mediaExtension(file) {
        var ext = fileExtension(file && file.name);
        if (IMAGE_TYPES[ext]) return ext;
        var type = (file && file.type || '').toLowerCase();
        for (var key in IMAGE_TYPES) {
            if (IMAGE_TYPES[key] === type) return key;
        }
        return 'png';
    }

    function stripMediaPrefix(name) {
        return String(name || '').replace(/^media\//, '');
    }

    /**
     * The format a save writes: the document's own format when the converter can write it,
     * otherwise the editor's default (a .doc is saved as .docx).
     */
    function saveFormat(fileType, documentType) {
        var pattern = SAVE_FORMATS[documentType];
        if (!pattern) return null;
        fileType = (fileType || '').toLowerCase();
        return pattern.test(fileType) ? fileType : DEFAULT_SAVE_FORMATS[documentType];
    }

    // The changes sdkjs sends in one saveChanges message: a JSON array of strings, or an array
    // (binary changes)
    function changeList(changes) {
        if (typeof changes === 'string') {
            try {
                var parsed = JSON.parse(changes);
                return Array.isArray(parsed) ? parsed : [changes];
            } catch (e) {
                return [changes];
            }
        }
        return Array.isArray(changes) ? changes : [];
    }

    /**
     * Normalises document.source.changes to the records DocsCoServer stores and sends in
     * authChanges: {docid, change, time, user, useridoriginal}, `change` being the JSON of one
     * change. Accepted items: such records (kept as they are), saveChanges messages
     * ({changes}), the `changes` value of a saveChanges message, or single change strings;
     * everything but records is attributed to `user`.
     */
    function changeRecords(source, docId, time, user, userOriginal) {
        var records = [];
        var push = function (change, isBinary) {
            records.push({docid: docId, change: isBinary ? change : JSON.stringify(change), time: time, user: user || '', useridoriginal: userOriginal || ''});
        };
        var add = function (item) {
            if (item === null || item === undefined) return;
            if (typeof item === 'string') {
                changeList(item).forEach(function (change) { push(change, false); });
            } else if (Array.isArray(item)) {
                item.forEach(add);
            } else if (ArrayBuffer.isView(item)) {
                push(item, true);
            } else if (typeof item === 'object' && item.change !== undefined) {
                records.push({
                    docid: item.docid || docId,
                    change: item.change,
                    time: item.time || time,
                    user: item.user !== undefined ? item.user : (user || ''),
                    useridoriginal: item.useridoriginal !== undefined ? item.useridoriginal : (userOriginal || '')
                });
            } else if (typeof item === 'object' && item.changes !== undefined) {
                var isBinary = typeof item.changes !== 'string';
                changeList(item.changes).forEach(function (change) { push(change, isBinary); });
            }
        };
        add(source || []);
        return records;
    }

    function registerDocumentImageUrl(name, url) {
        var AscCommon = window.AscCommon;
        var documentUrls = AscCommon && AscCommon.g_oDocumentUrls;
        documentUrls && typeof documentUrls.addImageUrl === 'function' && documentUrls.addImageUrl(name, url);
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
        this.registerImageUrl = options.registerImageUrl || registerDocumentImageUrl;
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

    Session.ERRORS = ERRORS;

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

    Session.prototype._userIdOriginal = function () {
        return this.user.id !== undefined && this.user.id !== null ? String(this.user.id) : 'local-user';
    };

    // The id sdkjs uses for this user: user id + indexUser (DocsCoApi._userId)
    Session.prototype.getUserId = function () {
        return this._userIdOriginal() + this.indexUser;
    };

    Session.prototype._participants = function () {
        var own = {
            id: this.getUserId(),
            idOriginal: this._userIdOriginal(),
            username: this.user.name || '',
            indexUser: this.indexUser,
            connectionId: this.sessionId,
            isCloseCoAuthoring: false,
            view: !this.editing
        };
        if (!this.initialParticipants) return [own];
        var participants = this.initialParticipants.filter(function (p) { return p && p.id !== own.id; });
        participants.push(own);
        return participants;
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
        switch (message.type) {
            case 'isSaveLock':
                this._emit({type: 'saveLock', saveLock: false});
                break;
            case 'getLock':
                this._onGetLock(message);
                break;
            case 'saveChanges':
                this._onSaveChanges(message);
                break;
            case 'unSaveLock':
                // emergency withdrawal without saving
                this._emit({type: 'unSaveLock', index: -1, time: -1, syncChangesIndex: -1});
                break;
            case 'unLockDocument':
                this._onUnLockDocument(message);
                break;
            default:
                // authChangesAck, cursor, message, getMessages, extendSession, clientLog...: there
                // is nobody to tell and sdkjs waits for no answer
                break;
        }
    };

    /**
     * 'host' transport: delivers a message to sdkjs as if the DocService had sent it. Messages
     * that arrive before the document was opened are held back until then.
     */
    Session.prototype.receiveHostMessage = function (message) {
        if (this.closed || !message || typeof message !== 'object') return;
        if (!this._documentOpened || !this.handlers) {
            this._hostQueue.push(message);
            return;
        }
        this._emit(message);
    };

    Session.prototype._flushHostQueue = function () {
        var queue = this._hostQueue;
        this._hostQueue = [];
        var me = this;
        queue.forEach(function (message) { me._emit(message); });
    };

    // DocsCoServer getLock: every block is granted to the only user, the reply carries all
    // locks of the document; keyed by block id (word) or block.guid (cell, slide, pdf)
    Session.prototype._onGetLock = function (message) {
        var me = this;
        var user = this.getUserId();
        var time = this.now();
        (message.block || []).forEach(function (block) {
            var key = (block && block.guid) || block;
            me.locks[key] = {time: time, user: user, block: block};
        });
        this._emit({type: 'getLock', locks: Object.assign({}, this.locks)});
    };

    Session.prototype._removeOwnLocks = function () {
        var user = this.getUserId();
        var removed = [];
        for (var key in this.locks) {
            if (this.locks.hasOwnProperty(key) && this.locks[key].user === user) {
                removed.push(this.locks[key]);
                delete this.locks[key];
            }
        }
        return removed;
    };

    Session.prototype._deleteChangesFrom = function (deleteIndex) {
        if (deleteIndex !== null && deleteIndex !== undefined && deleteIndex !== -1 && deleteIndex < this.changes.length)
            this.changes.length = Math.max(0, deleteIndex);
    };

    // DocsCoServer saveChanges: store the changes, answer savePartChanges for a chunk and
    // unSaveLock (index, time, syncChangesIndex) for the last one
    Session.prototype._onSaveChanges = function (message) {
        var me = this;
        var isBinary = typeof message.changes !== 'string';
        var newChanges = changeList(message.changes);
        var deleteIndex = -1;
        if (message.startSaveChanges && message.deleteIndex !== null && message.deleteIndex !== undefined) {
            deleteIndex = message.deleteIndex;
            this._deleteChangesFrom(deleteIndex);
        }
        var startIndex = this.changes.length;
        var time = this._nextTime();
        var user = this.getUserId();
        var userOriginal = this._userIdOriginal();
        newChanges.forEach(function (change) {
            me.changes.push({
                docid: me.sessionId,
                change: isBinary ? change : JSON.stringify(change),
                time: time,
                user: user,
                useridoriginal: userOriginal
            });
        });
        var changesIndex = (-1 === deleteIndex && message.startSaveChanges) ? startIndex : -1;
        if (message.endSaveChanges) {
            message.releaseLocks && this._removeOwnLocks();
            this._emit({type: 'unSaveLock', index: changesIndex, time: time, syncChangesIndex: this.changes.length});
        } else {
            this._emit({type: 'savePartChanges', changesIndex: changesIndex, syncChangesIndex: this.changes.length});
        }
    };

    // DocsCoServer unLockDocument (checkEndAuthLock): drop changes, release the user's locks
    // with a releaseLock message, and end a save with unSaveLock(-1, -1, -1)
    Session.prototype._onUnLockDocument = function (message) {
        this._deleteChangesFrom(message.deleteIndex);
        if (message.releaseLocks) {
            var time = this.now();
            var released = this._removeOwnLocks();
            released.length > 0 && this._emit({
                type: 'releaseLock',
                locks: released.map(function (lock) {
                    return {block: lock.block, user: lock.user, time: time, changes: null};
                })
            });
        }
        message.isSave && this._emit({type: 'unSaveLock', index: -1, time: -1, syncChangesIndex: -1});
    };

    /**
     * A user save (save button, Ctrl+S, File > Save; see Host): export the document to
     * saveFormat and hand the file to the host, even when nothing changed. sdkjs is told like
     * after a DocService forcesave (forceSaveStart, then forceSave), so the editor shows the
     * save in progress. Also the answer when sdkjs itself sends forceSaveStart.
     */
    Session.prototype.startUserSave = function () {
        if (this.closed) return false;
        if (this._pendingSave) {
            this._emit({type: 'forceSaveStart', messages: {code: SERVER_NO_ERROR, time: this._pendingSave.time, inProgress: true}});
            return true;
        }
        var time = this._nextTime();
        if (!this.saveFormat || typeof this.onSaveRequest !== 'function') {
            this._emit({type: 'forceSaveStart', messages: {code: SERVER_UNKNOWN_ERROR, time: null, inProgress: false}});
            return false;
        }
        var save = this._pendingSave = {time: time, format: this.saveFormat};
        this._emit({type: 'forceSaveStart', messages: {code: SERVER_NO_ERROR, time: time, inProgress: false}});
        var started = false;
        try {
            started = this.onSaveRequest(this.saveFormat) !== false;
        } catch (e) {
            console.error(e);
        }
        !started && this._endSave(save, false);
        return started;
    };

    Session.prototype._endSave = function (save, success) {
        if (save.ended) return;
        save.ended = true;
        if (this._pendingSave === save)
            this._pendingSave = null;
        this._emit({type: 'forceSave', messages: {type: FORCE_SAVE_BUTTON, time: save.time, success: success}});
    };

    Session.prototype._onAuth = function (message) {
        var me = this;
        var version = this.getVersion() || {};
        var now = Date.now();
        this._getDocumentUrls(message.openCmd).then(function (urls) {
            if (me.closed) return;
            var changes = me.changes.slice();
            me._emit({type: 'authChanges', changes: changes});
            me._emit({
                type: 'auth',
                result: 1,
                sessionId: me.sessionId,
                sessionTimeConnect: now,
                participants: me._participants(),
                locks: [],
                changes: changes,
                changesIndex: changes.length,
                indexUser: me.indexUser,
                buildVersion: version.buildVersion || '',
                buildNumber: version.buildNumber || 0,
                licenseType: LICENSE_SUCCESS,
                openedAt: now
            });
            me._emit({type: 'documentOpen', data: {type: 'open', status: 'ok', openedAt: now, data: urls}});
            me._documentOpened = true;
            me.onProgress('open', 100);
            // not a DocService message: tells the host which connection this editor is
            me.transportType === 'host' && me.onHostMessage({
                type: 'sessionAuth',
                user: me._userIdOriginal(),
                indexUser: me.indexUser,
                connectionId: me.getUserId(),
                sessionId: me.sessionId
            });
            me._flushHostQueue();
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

    // imgurls and pathurls resolve media names to the session's urls; any other call (wopi,
    // saveRelativeFromChanges...) needs a server and gets an empty answer right away, which
    // sdkjs treats as a failure instead of waiting for its timeout
    Session.prototype._onRpc = function (message) {
        var me = this;
        var request = message.data || {};
        var command = request.type || request.c;
        var response;
        if (command === 'imgurls' || command === 'pathurls') {
            response = {
                status: 'ok',
                data: (request.data || []).map(function (name) { return me._imageUrl(name); })
            };
        }
        this._emit({type: 'rpc', responseKey: message.responseKey, data: response});
    };

    Session.prototype._imageUrl = function (name) {
        return this.urls['media/' + name] || this.urls[name] || this.urls['media/' + stripMediaPrefix(name)] || name;
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
                return {name: stripMediaPrefix(name), url: me._addMedia(stripMediaPrefix(name), toUint8Array(buffer))};
            });
        }));
    };

    Session.prototype._addMedia = function (name, bytes, type) {
        var blob = new Blob([bytes], {type: type || mimeType(name)});
        var url = this.createObjectURL(blob);
        this.mediaBytes[name] = bytes;
        this.urls['media/' + name] = url;
        this.urls[name] = url;
        return url;
    };

    /**
     * Media from elsewhere (other users of a 'host' session): makes the names resolvable for
     * sdkjs (imgurls, g_oDocumentUrls) and includes the bytes in later exports.
     * @param {Object} media {name: Blob|ArrayBuffer|Uint8Array}, names with or without 'media/'
     * @returns {Promise}
     */
    Session.prototype.addMedia = function (media) {
        var me = this;
        if (this.closed || !media || typeof media !== 'object') return Promise.resolve([]);
        return this._readMedia(media).then(function (added) {
            if (me.closed) return [];
            added.forEach(function (item) { me.registerImageUrl(item.name, item.url); });
            return added;
        });
    };

    Session.prototype._newMediaName = function (file) {
        return 'image_' + this.sessionId.replace(/^local-/, '').slice(0, 8) + '_' + (++this._mediaCount) + '.' + mediaExtension(file);
    };

    // transport.uploadImageUrls (image from url): fetched into the session media when CORS
    // allows; answers [{path: 'media/<name>', url}] like the DocService upload
    Session.prototype._uploadImageUrls = function (urls, callback) {
        var me = this;
        var list = Array.prototype.slice.call(urls || []);
        if (list.length === 0 || typeof fetch !== 'function') {
            callback(list.length === 0 ? UPLOAD_FILE_COUNT : UPLOAD_URL);
            return;
        }
        Promise.all(list.map(function (url) {
            return fetch(url).then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.blob();
            }).then(function (blob) {
                if (blob.type && !/^image\//.test(blob.type)) throw new Error('not an image: ' + blob.type);
                return blobToArrayBuffer(blob).then(function (buffer) {
                    var name = String(url).split(/[?#]/)[0];
                    return {file: {name: name, type: blob.type}, bytes: toUint8Array(buffer)};
                });
            });
        })).then(function (items) {
            if (me.closed) return;
            callback(UPLOAD_NO_ERROR, items.map(function (item) {
                var stored = me._storeUpload(item.file, item.bytes);
                return {path: 'media/' + stored.name, url: stored.url};
            }));
        }, function (error) {
            if (me.closed) return;
            console.error('Local session image download failed: ' + errorMessage(error));
            callback(UPLOAD_URL);
        });
    };

    Session.prototype._storeUpload = function (file, bytes) {
        var name = this._newMediaName(file);
        var type = file.type || mimeType(name);
        var url = this._addMedia(name, bytes, type);
        this.registerImageUrl(name, url);
        this.onMedia(name, new Blob([bytes], {type: type}));
        return {name: name, url: url};
    };

    // transport.uploadImages: the inserted files become session media; sdkjs gets
    // {'media/<name>': url} like from the DocService upload, so it saves the media path
    Session.prototype._uploadImages = function (files, callback) {
        var me = this;
        var list = Array.prototype.slice.call(files || []);
        if (list.length === 0) {
            callback(UPLOAD_FILE_COUNT);
            return;
        }
        Promise.all(list.map(function (file) {
            return blobToArrayBuffer(file).then(function (buffer) {
                return {file: file, bytes: toUint8Array(buffer)};
            });
        })).then(function (items) {
            if (me.closed) return;
            var urls = {};
            items.forEach(function (item) {
                var stored = me._storeUpload(item.file, item.bytes);
                urls['media/' + stored.name] = stored.url;
            });
            callback(UPLOAD_NO_ERROR, urls);
        }, function (error) {
            if (me.closed) return;
            console.error('Local session image upload failed: ' + errorMessage(error));
            callback(UPLOAD_URL);
        });
    };

    Session.prototype._getDocumentUrls = function (openCmd) {
        var me = this;
        if (this._documentUrlsPromise) return this._documentUrlsPromise;
        this._documentUrlsPromise = this._waitSource().then(function (source) {
            return me._readMedia(source.media).then(function () { return source; });
        }).then(function (source) {
            if (source.format === 'bin') {
                // the host kept the editor binary itself (e.g. a checkpoint), nothing to convert
                me.urls['Editor.bin'] = me.createObjectURL(new Blob([source.bytes]));
                return me.urls;
            }
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
        var save = this._pendingSave && !request.isPrint && this._pendingSave.format === format ? this._pendingSave : null;
        if (save)
            this._pendingSave = null;
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
            var url = me._registerBlob(blob, format);
            if (save) {
                me.onSave(blob, format);
                me._endSave(save, true);
            }
            callback({status: 'ok', data: url, filetype: format});
        }).catch(function (error) {
            if (me.closed) return;
            me._fail(errorCode(error), errorMessage(error));
            save && me._endSave(save, false);
            callback({status: 'err', error: errorCode(error)});
        });
    };

    // ---------------------------------------------------------------------
    // Host: wires a Session into an editor app (desktop or mobile). Kept free
    // of Backbone and React so every app shell can use it.

    var FONT_STYLE_SUFFIX = {indexR: '', indexB: '_Bold', indexI: '_Italic', indexBI: '_Bold_Italic'};
    var FONT_FILES_PATH = '../../../../fonts/';

    var DEFAULT_MESSAGES = {
        notSupported: 'This editor build cannot open documents without a Document Server.',
        converterLoad: 'The document converter could not be loaded.',
        convert: 'The document could not be converted in the browser.',
        unsupportedFormat: 'This file format cannot be opened without a Document Server.',
        outOfMemory: 'The document is too large to be opened in the browser.'
    };

    function loadConverterModule(baseUrl) {
        var url = baseUrl.replace(/\/?$/, '/') + 'converter.js';
        // The converter ships with the Document Server next to web-apps and is
        // not part of the bundle, hence the native import.
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
        this.loadConverter = options.loadConverter || loadConverterModule;
        this.getFonts = options.getFonts || loadedFonts;
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

    // editorConfig helpers shared by the desktop and mobile editors; api.js has already
    // normalised mode and session.transport
    function isLocalSessionConfig(config) {
        return !!(config && config.session && config.session.type === 'local');
    }

    function sessionTransport(config) {
        return isLocalSessionConfig(config) && config.session.transport === 'host' ? 'host' : 'self';
    }

    // Chat needs a server in every case; a viewer gets no editing rights at all.
    function restrictPermissions(permissions, config) {
        permissions.chat = false;
        if (!config || config.mode !== 'edit')
            permissions.edit = permissions.review = permissions.comment = permissions.fillForms = permissions.protect = false;
        return permissions;
    }

    Common.LocalSession.Session = Session;
    Common.LocalSession.Host = Host;
    Common.LocalSession.ERRORS = ERRORS;
    Common.LocalSession.fileExtension = fileExtension;
    Common.LocalSession.saveFormat = saveFormat;
    Common.LocalSession.changeRecords = changeRecords;
    Common.LocalSession.isLocalSessionConfig = isLocalSessionConfig;
    Common.LocalSession.sessionTransport = sessionTransport;
    Common.LocalSession.restrictPermissions = restrictPermissions;

    return Common.LocalSession;
});
