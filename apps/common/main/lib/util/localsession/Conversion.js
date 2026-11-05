/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// The in-browser converter (x2t): loading it, importing the source into the
// editor binary and exporting the editor binary for downloads and saves.
// The methods are mixed into Session.prototype; loadConverterModule and
// loadedFonts are the defaults Host passes to a Session.

define([
    './helpers'
], function (helpers) { 'use strict';

    var ERRORS = helpers.ERRORS,
        toUint8Array = helpers.toUint8Array,
        errorCode = helpers.errorCode,
        errorMessage = helpers.errorMessage;

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

    var FONT_STYLE_SUFFIX = {indexR: '', indexB: '_Bold', indexI: '_Italic', indexBI: '_Bold_Italic'};
    var FONT_FILES_PATH = '../../../../fonts/';

    function loadConverterModule(baseUrl) {
        var url = baseUrl.replace(/\/?$/, '/') + 'converter.js';
        // The converter ships with the Document Server next to web-apps and is
        // not part of the bundle, hence the native import.
        return import(/* webpackIgnore: true */ url);
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

    var methods = {
        _getConverter: function () {
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
        },

        _getDocumentUrls: function (openCmd) {
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
        },

        _convertForDownload: function (request, callback) {
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
        }
    };

    return {
        methods: methods,
        loadConverterModule: loadConverterModule,
        loadedFonts: loadedFonts
    };
});
