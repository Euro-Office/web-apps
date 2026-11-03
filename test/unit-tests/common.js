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
 *  common.js
 *
 *  Created by Alexander Yuzhin on 5/7/14
 *  Copyright (c) 2018 Ascensio System SIA. All rights reserved.
 *
 */

// Include and setup all the stuff for testing
define([
    'chai',
    'backbone'
],function(chai) {
    window.expect = chai.expect;
    window.assert = chai.assert;

    // Components read a little ambient state at render time -- Button asks
    // Common.UI.Scaling for the current ratio, and the menus ask Common.Locale
    // for the text direction. Pulling in the real modules would drag 'core' and
    // the whole application bootstrap into a unit test, so stub the two calls.
    window.Common = window.Common || {};
    Common.Controllers = Common.Controllers || {};
    Common.UI = Common.UI || {};
    Common.UI.Scaling = Common.UI.Scaling || {};
    if (!Common.UI.Scaling.currentRatio) {
        Common.UI.Scaling.currentRatio = function() { return 1; };
    }
    Common.Locale = Common.Locale || {};
    if (!Common.Locale.isCurrentLanguageRtl) {
        Common.Locale.isCurrentLanguageRtl = function() { return false; };
    }
    // Components subscribe to app-wide events (uitheme:changed, modal:close)
    // on render. Backbone.Events is the same thing the application installs.
    if (!Common.NotificationCenter) {
        Common.NotificationCenter = _.extend({}, Backbone.Events);
    }
});
