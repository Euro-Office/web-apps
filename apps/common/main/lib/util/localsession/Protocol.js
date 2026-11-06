/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// The DocService answers of a local session, shaped like DocsCoServer's:
// license, auth and documentOpen (both transports), the single-user co-editing
// replies of the 'self' transport, rpc and the user save (forcesave). Mixed
// into Session.prototype.

define([
    './helpers'
], function (helpers) { 'use strict';

    var errorCode = helpers.errorCode,
        errorMessage = helpers.errorMessage,
        changeList = helpers.changeList;

    var LICENSE_SUCCESS = 3;        // Asc.c_oLicenseResult.Success
    var RIGHTS_EDIT = 1;            // Asc.c_oRights.Edit
    var LICENSE_MODE_NONE = 0;      // Asc.c_oLicenseMode.None

    var SERVER_NO_ERROR = 0;        // AscCommon.c_oAscServerCommandErrors.NoError
    var SERVER_UNKNOWN_ERROR = 3;   // AscCommon.c_oAscServerCommandErrors.UnknownError
    var FORCE_SAVE_BUTTON = 1;      // AscCommon.c_oAscForceSaveTypes.Button

    var methods = {
        _licenseMessage: function () {
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
        },

        _participants: function () {
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
        },

        // 'self' transport: the co-editing messages a DocService with a single editor answers
        _answerSingleUser: function (message) {
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
        },

        // DocsCoServer getLock: every block is granted to the only user, the reply carries all
        // locks of the document; keyed by block id (word) or block.guid (cell, slide, pdf)
        _onGetLock: function (message) {
            var me = this;
            var user = this.getUserId();
            var time = this.now();
            (message.block || []).forEach(function (block) {
                var key = (block && block.guid) || block;
                me.locks[key] = {time: time, user: user, block: block};
            });
            this._emit({type: 'getLock', locks: Object.assign({}, this.locks)});
        },

        _removeOwnLocks: function () {
            var user = this.getUserId();
            var removed = [];
            for (var key in this.locks) {
                if (this.locks.hasOwnProperty(key) && this.locks[key].user === user) {
                    removed.push(this.locks[key]);
                    delete this.locks[key];
                }
            }
            return removed;
        },

        _deleteChangesFrom: function (deleteIndex) {
            if (deleteIndex !== null && deleteIndex !== undefined && deleteIndex !== -1 && deleteIndex < this.changes.length)
                this.changes.length = Math.max(0, deleteIndex);
        },

        // DocsCoServer saveChanges: store the changes, answer savePartChanges for a chunk and
        // unSaveLock (index, time, syncChangesIndex) for the last one
        _onSaveChanges: function (message) {
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
        },

        // DocsCoServer unLockDocument (checkEndAuthLock): drop changes, release the user's locks
        // with a releaseLock message, and end a save with unSaveLock(-1, -1, -1)
        _onUnLockDocument: function (message) {
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
        },

        /**
         * A user save (save button, Ctrl+S, File > Save; see Host): export the document to
         * saveFormat and hand the file to the host, even when nothing changed. sdkjs is told like
         * after a DocService forcesave (forceSaveStart, then forceSave), so the editor shows the
         * save in progress. Also the answer when sdkjs itself sends forceSaveStart.
         */
        startUserSave: function () {
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
        },

        _endSave: function (save, success) {
            if (save.ended) return;
            save.ended = true;
            if (this._pendingSave === save)
                this._pendingSave = null;
            this._emit({type: 'forceSave', messages: {type: FORCE_SAVE_BUTTON, time: save.time, success: success}});
        },

        _onAuth: function (message) {
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
                me._startRelay();
            }, function (error) {
                if (me.closed) return;
                me._fail(errorCode(error), errorMessage(error));
                me._emit({type: 'documentOpen', data: {type: 'open', status: 'err', data: -1}});
            });
        },

        _onOpenDocumentRequest: function (message) {
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
        },

        // imgurls and pathurls resolve media names to the session's urls; any other call (wopi,
        // saveRelativeFromChanges...) needs a server and gets an empty answer right away, which
        // sdkjs treats as a failure instead of waiting for its timeout
        _onRpc: function (message) {
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
        }
    };

    return {methods: methods};
});
