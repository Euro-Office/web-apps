/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Constants and pure helpers shared by the local session modules, plus the
// editorConfig helpers the desktop and mobile editors use.

define([], function () { 'use strict';

    var ERRORS = {
        Load: -100,
        Convert: -101,
        Unsupported: -102,
        Memory: -103
    };

    // Formats the converter can write back; anything else is saved in the editor's default format
    var SAVE_FORMATS = {
        word: /^(docx|docm|dotx|dotm|odt|ott|rtf)$/,
        cell: /^(xlsx|xlsm|xltx|xltm|ods|ots)$/,
        slide: /^(pptx|pptm|ppsx|ppsm|potx|potm|odp|otp)$/
    };
    var DEFAULT_SAVE_FORMATS = {word: 'docx', cell: 'xlsx', slide: 'pptx'};

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

    // appOptions.canCoAuthoring: a local session co-edits only through the 'host' transport
    function canCoAuthoring(config) {
        return !isLocalSessionConfig(config) || sessionTransport(config) === 'host';
    }

    // The save and mail merge flags of a desktop editor in a local session, applied after the
    // editor has set its own
    function applyAppOptions(appOptions) {
        if (!appOptions.isLocalSession) return;
        // keeps the save button on: every user save exports the document (Host), there is no setting for it
        appOptions.canForcesave = false;
        appOptions.forcesave = appOptions.isEdit;
        // mail merge needs a server
        appOptions.canUseMailMerge && (appOptions.canUseMailMerge = false);
    }

    return {
        ERRORS: ERRORS,
        noop: noop,
        defer: defer,
        fileExtension: fileExtension,
        toUint8Array: toUint8Array,
        blobToArrayBuffer: blobToArrayBuffer,
        errorCode: errorCode,
        errorMessage: errorMessage,
        saveFormat: saveFormat,
        changeList: changeList,
        changeRecords: changeRecords,
        isLocalSessionConfig: isLocalSessionConfig,
        sessionTransport: sessionTransport,
        restrictPermissions: restrictPermissions,
        canCoAuthoring: canCoAuthoring,
        applyAppOptions: applyAppOptions
    };
});
