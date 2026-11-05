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
 *  The modules live in localsession/ and have no dependencies on the
 *  application bootstrap so they can be unit tested; this file publishes them
 *  on Common.LocalSession. See DocumentServer/docs/client-only-editor.md.
 */

// window.Common, not `var Common`: the mobile apps bundle this file as a
// module, where a var would stay local and Common.LocalSession never global.
if (window.Common === undefined)
    window.Common = {};

Common.LocalSession = Common.LocalSession || {};

define([
    './localsession/helpers',
    './localsession/Session',
    './localsession/Host'
], function (helpers, Session, Host) { 'use strict';

    Common.LocalSession.Session = Session;
    Common.LocalSession.Host = Host;
    Common.LocalSession.ERRORS = helpers.ERRORS;
    Common.LocalSession.fileExtension = helpers.fileExtension;
    Common.LocalSession.saveFormat = helpers.saveFormat;
    Common.LocalSession.changeRecords = helpers.changeRecords;
    Common.LocalSession.isLocalSessionConfig = helpers.isLocalSessionConfig;
    Common.LocalSession.sessionTransport = helpers.sessionTransport;
    Common.LocalSession.restrictPermissions = helpers.restrictPermissions;

    return Common.LocalSession;
});
