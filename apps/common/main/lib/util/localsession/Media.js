/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Session media: the images of the document and the ones the user inserts,
// served to sdkjs as object urls and kept as bytes for exports. Mixed into
// Session.prototype.

define([
    './helpers'
], function (helpers) { 'use strict';

    var toUint8Array = helpers.toUint8Array,
        blobToArrayBuffer = helpers.blobToArrayBuffer,
        fileExtension = helpers.fileExtension,
        errorMessage = helpers.errorMessage;

    var UPLOAD_NO_ERROR = 0;        // Asc.c_oAscError.ID.No
    var UPLOAD_FILE_COUNT = -11;    // Asc.c_oAscError.ID.UplImageFileCount
    var UPLOAD_URL = -13;           // Asc.c_oAscError.ID.UplImageUrl

    var IMAGE_TYPES = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp',
        svg: 'image/svg+xml', webp: 'image/webp', tif: 'image/tiff', tiff: 'image/tiff',
        emf: 'image/emf', wmf: 'image/wmf'
    };

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

    var methods = {
        // Default for options.registerImageUrl: makes a media url known to sdkjs
        registerImageUrl: function (name, url) {
            var AscCommon = window.AscCommon;
            var documentUrls = AscCommon && AscCommon.g_oDocumentUrls;
            documentUrls && typeof documentUrls.addImageUrl === 'function' && documentUrls.addImageUrl(name, url);
        },

        _imageUrl: function (name) {
            return this.urls['media/' + name] || this.urls[name] || this.urls['media/' + stripMediaPrefix(name)] || name;
        },

        _imageUrls: function (names) {
            var me = this;
            return (names || []).map(function (name) {
                return {path: name, url: me._imageUrl(name)};
            });
        },

        _readMedia: function (media) {
            var me = this;
            var names = media ? Object.keys(media) : [];
            return Promise.all(names.map(function (name) {
                var value = media[name];
                var read = (typeof Blob !== 'undefined' && value instanceof Blob) ? blobToArrayBuffer(value) : Promise.resolve(value);
                return read.then(function (buffer) {
                    return {name: stripMediaPrefix(name), url: me._addMedia(stripMediaPrefix(name), toUint8Array(buffer))};
                });
            }));
        },

        _addMedia: function (name, bytes, type) {
            var blob = new Blob([bytes], {type: type || mimeType(name)});
            var url = this.createObjectURL(blob);
            this.mediaBytes[name] = bytes;
            this.urls['media/' + name] = url;
            this.urls[name] = url;
            return url;
        },

        /**
         * Media from elsewhere (other users of a 'host' session): makes the names resolvable for
         * sdkjs (imgurls, g_oDocumentUrls) and includes the bytes in later exports.
         * @param {Object} media {name: Blob|ArrayBuffer|Uint8Array}, names with or without 'media/'
         * @returns {Promise}
         */
        addMedia: function (media) {
            var me = this;
            if (this.closed || !media || typeof media !== 'object') return Promise.resolve([]);
            return this._readMedia(media).then(function (added) {
                if (me.closed) return [];
                added.forEach(function (item) { me.registerImageUrl(item.name, item.url); });
                return added;
            });
        },

        _newMediaName: function (file) {
            return 'image_' + this.sessionId.replace(/^local-/, '').slice(0, 8) + '_' + (++this._mediaCount) + '.' + mediaExtension(file);
        },

        // transport.uploadImageUrls (image from url): fetched into the session media when CORS
        // allows; answers [{path: 'media/<name>', url}] like the DocService upload
        _uploadImageUrls: function (urls, callback) {
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
        },

        _storeUpload: function (file, bytes) {
            var name = this._newMediaName(file);
            var type = file.type || mimeType(name);
            var url = this._addMedia(name, bytes, type);
            this.registerImageUrl(name, url);
            this.onMedia(name, new Blob([bytes], {type: type}));
            return {name: name, url: url};
        },

        // transport.uploadImages: the inserted files become session media; sdkjs gets
        // {'media/<name>': url} like from the DocService upload, so it saves the media path
        _uploadImages: function (files, callback) {
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
        }
    };

    return {methods: methods};
});
