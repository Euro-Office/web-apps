/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// The local session host of the desktop editors: localized error texts and a
// warning when the SDK build cannot run a local session. The mobile editors
// have their own, apps/common/mobile/utils/localSession.js.

if (window.Common === undefined)
    window.Common = {};

define([
    '../LocalSession'
], function () { 'use strict';

    // Translated through the Common.Controllers.LocalSession.* keys of the editors' locales
    var TEXTS = {
        errorNotSupported: 'This editor build cannot open documents without a Document Server.',
        errorConverterLoad: 'The document converter could not be loaded.',
        errorConvert: 'The document could not be converted in the browser.',
        errorUnsupportedFormat: 'This file format cannot be opened without a Document Server.',
        errorOutOfMemory: 'The document is too large to be opened in the browser.'
    };

    /**
     * Creates the host and starts listening for the document bytes, which api.js posts before
     * the document is opened: call before Common.Gateway.appReady.
     * @returns {Common.LocalSession.Host}
     */
    Common.LocalSession.createDesktopHost = function () {
        var texts = Object.assign({}, TEXTS, Common.Controllers && Common.Controllers.LocalSession);
        var host = new Common.LocalSession.Host({
            gateway: Common.Gateway,
            messages: {
                notSupported: texts.errorNotSupported,
                converterLoad: texts.errorConverterLoad,
                convert: texts.errorConvert,
                unsupportedFormat: texts.errorUnsupportedFormat,
                outOfMemory: texts.errorOutOfMemory
            },
            onError: function (code, text) {
                text === texts.errorNotSupported && Common.UI.warning({msg: text, buttons: []});
            }
        });
        host.listen();
        return host;
    };

    return Common.LocalSession.createDesktopHost;
});
