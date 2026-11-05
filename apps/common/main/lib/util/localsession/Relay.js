/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// The 'host' transport: co-editing messages from sdkjs go to the host page
// (options.onHostMessage), the host's answers reach sdkjs unchanged once the
// document is open. Mixed into Session.prototype.

define([], function () { 'use strict';

    var methods = {
        /**
         * 'host' transport: delivers a message to sdkjs as if the DocService had sent it. Messages
         * that arrive before the document was opened are held back until then.
         */
        receiveHostMessage: function (message) {
            if (this.closed || !message || typeof message !== 'object') return;
            if (!this._documentOpened || !this.handlers) {
                this._hostQueue.push(message);
                return;
            }
            this._emit(message);
        },

        // After documentOpen: tells the host which connection this editor is (sessionAuth is not a
        // DocService message), then delivers what the host sent before
        _startRelay: function () {
            this.transportType === 'host' && this.onHostMessage({
                type: 'sessionAuth',
                user: this._userIdOriginal(),
                indexUser: this.indexUser,
                connectionId: this.getUserId(),
                sessionId: this.sessionId
            });
            this._flushHostQueue();
        },

        _flushHostQueue: function () {
            var queue = this._hostQueue;
            this._hostQueue = [];
            var me = this;
            queue.forEach(function (message) { me._emit(message); });
        }
    };

    return {methods: methods};
});
