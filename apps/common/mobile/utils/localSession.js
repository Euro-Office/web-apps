/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Local (client-only) sessions in the mobile editors: the host page hands over
// the document bytes and x2t converts them in the browser, see
// apps/common/main/lib/util/LocalSession.js for the session itself.

import { f7 } from 'framework7-react';
import '../../main/lib/util/LocalSession.js';

export const isLocalSessionConfig = config => !!(config && config.session && config.session.type === 'local');

// Nothing can be saved without a Document Server, so a local session is view only.
export const restrictLocalSessionPermissions = permissions => {
    permissions.edit = permissions.review = permissions.comment = permissions.fillForms = permissions.protect = permissions.chat = false;
    return permissions;
};

const appVersion = () => {
    const cropped = /^(\d+\.\d+\.\d+)(?:\.(\d+))?/.exec(__PRODUCT_VERSION__);
    return {
        buildVersion: cropped ? cropped[1] : __PRODUCT_VERSION__,
        buildNumber: cropped && cropped[2] ? parseInt(cropped[2]) : 0
    };
};

/**
 * Creates the session host and starts listening for the document bytes, which
 * api.js posts before the document is opened.
 *
 * @param {Object} _t the editor's 'Main' translations
 */
export const createLocalSessionHost = _t => {
    const host = new Common.LocalSession.Host({
        gateway: Common.Gateway,
        getVersion: appVersion,
        messages: {
            notSupported: _t.errorLocalSessionNotSupported,
            converterLoad: _t.errorLocalSessionConverterLoad,
            convert: _t.errorLocalSessionConvert,
            unsupportedFormat: _t.errorLocalSessionUnsupportedFormat,
            outOfMemory: _t.errorLocalSessionOutOfMemory
        },
        onError: (code, text) => f7.dialog.alert(text, _t.titleLocalSessionError)
    });
    host.listen();
    return host;
};
