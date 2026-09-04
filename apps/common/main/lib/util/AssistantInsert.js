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

    // sdkjs parks this element on the page for the duration of a PasteHtml and
    // refuses a second one while it is there (api_plugins.js).
    var PASTE_GUARD_ID = 'pmpastehtml';

    // 100 ms x 20 = 2 s. A paste of a few paragraphs is done in a fraction of
    // that; anything still running after it is not about to finish either.
    var RETRY_INTERVAL = 100,
        MAX_ATTEMPTS = 20;

    Common.Utils.AssistantInsert = _.extend({

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
                if (document.getElementById(PASTE_GUARD_ID)) {
                    if (attempt < MAX_ATTEMPTS) {
                        setTimeout(function() {
                            Common.Utils.AssistantInsert.insert(api, result, attempt + 1);
                        }, RETRY_INTERVAL);
                        return;
                    }
                    // Still guarded. Calling PasteHtml anyway is not a fallback:
                    // the guard drops it without a word, and the answer the user
                    // waited for would simply never appear in the document.
                    // Plain text loses the formatting but keeps the content, so
                    // try that; only when there is none is there nothing left to
                    // do but say so.
                    if (text && typeof api['pluginMethod_PasteText'] === 'function') {
                        api['pluginMethod_PasteText'](text);
                        Common.NotificationCenter.trigger('edit:complete');
                        return;
                    }
                    Common.UI.warning({msg: Common.Utils.AssistantInsert.txtInsertFailed});
                    return;
                }
                api['pluginMethod_PasteHtml'](html);
            } else if (typeof api['pluginMethod_PasteText'] === 'function') {
                api['pluginMethod_PasteText'](text);
            }

            Common.NotificationCenter.trigger('edit:complete');
        },

        txtInsertFailed: 'The editor is busy, so the Assistant result could not be inserted. Try inserting it again.'

    }, Common.Utils.AssistantInsert || {});

    return Common.Utils.AssistantInsert;
});
