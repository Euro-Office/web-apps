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
 *  bytes and the host's session messages from api.js, registers the transport
 *  with sdkjs and reports progress, saves, inserted images and errors to the
 *  integrator through the Gateway.
 */

if (Common === undefined)
    var Common = {};

Common.Controllers = Common.Controllers || {};

define([
    'core',
    'common/main/lib/util/LocalSession'
], function () { 'use strict';

    Common.Controllers.LocalSession = Backbone.Controller.extend(_.extend({
        models: [],
        collections: [],
        views: [],

        initialize: function () {
            this.host = null;
        },

        onLaunch: function () {
            var me = this;
            this.host = new Common.LocalSession.Host({
                gateway: Common.Gateway,
                messages: {
                    notSupported: this.errorNotSupported,
                    converterLoad: this.errorConverterLoad,
                    convert: this.errorConvert,
                    unsupportedFormat: this.errorUnsupportedFormat,
                    outOfMemory: this.errorOutOfMemory
                },
                onError: function (code, text) {
                    text === me.errorNotSupported && Common.UI.warning({msg: text, buttons: []});
                }
            });
            this.host.listen();
        },

        /**
         * Registers the local transport with sdkjs. Must run before api.asc_setDocInfo.
         *
         * @param {Object} api
         * @param {Object} options {documentType, user, x2tUrl, mode, transport, fileType}
         * @returns {boolean} false when this SDK build has no local session support
         */
        start: function (api, options) {
            return this.host.start(_.extend({api: api}, options));
        },

        getBlob: function (url) {
            return this.host ? this.host.getBlob(url) : null;
        },

        getFileType: function (url) {
            return this.host ? this.host.getFileType(url) : null;
        },

        isActive: function () {
            return !!this.host && this.host.isActive();
        },

        stop: function () {
            this.host && this.host.stop();
        },

        errorNotSupported: 'This editor build cannot open documents without a Document Server.',
        errorConverterLoad: 'The document converter could not be loaded.',
        errorConvert: 'The document could not be converted in the browser.',
        errorUnsupportedFormat: 'This file format cannot be opened without a Document Server.',
        errorOutOfMemory: 'The document is too large to be opened in the browser.'
    }, Common.Controllers.LocalSession || {}));
});
