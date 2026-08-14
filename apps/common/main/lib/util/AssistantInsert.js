/*!
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH or an Nextcloud affiliate company and Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
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
