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

/*
 * Insert an Assistant result into the document, keeping its formatting.
 *
 * The result arrives from the host as HTML, converted there from the markdown
 * these models emit. Plain-text paste would drop headings, lists and emphasis,
 * which is why this goes through pluginMethod_PasteHtml.
 */
define([], function () { 'use strict';

    Common.Utils = Common.Utils || {};

    Common.Utils.AssistantInsert = {

        /**
         * @param {Object} api the editor api
         * @param {Object} result {html, text}
         * @param {Number} attempt internal, counts retries
         */
        insert: function(api, result, attempt) {
            if (!api || !result) return;
            attempt = attempt || 0;

            var html = result.html,
                text = result.text || '';

            if (html && typeof api['pluginMethod_PasteHtml'] === 'function') {
                // PasteHtml is re-entrancy guarded on this element, so a second
                // insertion while one is still running is dropped. Wait it out
                // rather than losing the result.
                if (document.getElementById('pmpastehtml')) {
                    if (attempt < 20) {
                        setTimeout(function() {
                            Common.Utils.AssistantInsert.insert(api, result, attempt + 1);
                        }, 100);
                        return;
                    }
                }
                api['pluginMethod_PasteHtml'](html);
            } else if (typeof api['pluginMethod_PasteText'] === 'function') {
                api['pluginMethod_PasteText'](text);
            }

            Common.NotificationCenter.trigger('edit:complete');
        }
    };

    return Common.Utils.AssistantInsert;
});
