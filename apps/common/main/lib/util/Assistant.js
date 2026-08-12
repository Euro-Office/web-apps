/*
 * Nextcloud Assistant client for the editors.
 *
 * The editor cannot reach Nextcloud directly (the OCS routes are user-scoped and
 * send no CORS headers), so every call is a named operation forwarded over the
 * integration bridge and answered asynchronously by the Nextcloud page, which
 * holds the user's session.
 *
 * Usage:
 *     Common.Assistant.request('taskTypes').then(...)
 *     Common.Assistant.run('core:text2text', {input: '…'}).then(...)
 */
define([], function () { 'use strict';

    Common.Assistant = new(function() {
        var _available = false,
            _inited = false,
            _seq = 0,
            _pending = {},
            _taskTypes;

        /** Wire the single inbound listener the first time anything is requested. */
        var _init = function() {
            if (_inited) return;
            _inited = true;

            Common.Gateway.on('setassistantresult', function(reply) {
                var id = reply && reply.id,
                    entry = id && _pending[id];
                if (!entry) return;              // late answer to a discarded request
                delete _pending[id];
                window.clearTimeout(entry.timer);

                if (reply.ok) {
                    entry.resolve(reply.data || {});
                } else {
                    var err = new Error(reply.error || 'The Assistant request failed.');
                    err.cancelled = !!reply.cancelled;
                    entry.reject(err);
                }
            });
        };

        /**
         * The host never answering would leave the caller hanging forever. The
         * host applies its own, shorter deadline to a task; this is only a
         * backstop for a bridge that has gone away entirely.
         */
        var BRIDGE_TIMEOUT = 300000;

        /** Marker error so callers can distinguish a user cancel from a failure. */
        var _cancelledError = function() {
            var err = new Error('Cancelled');
            err.cancelled = true;
            return err;
        };

        return {
            /** Told by the integration whether an Assistant backend exists. */
            setAvailable: function(value) {
                _available = !!value;
                if (!_available) _taskTypes = undefined;
            },

            isAvailable: function() {
                return _available;
            },

            /**
             * Perform one named operation on the Nextcloud side.
             * @param {String} op one of the operations the integration allows
             * @param {Object} params operation parameters
             * @return {Promise} resolves with the operation's data
             */
            request: function(op, params) {
                _init();
                var id = 'a' + (++_seq) + '-' + (new Date()).getTime();
                var promise = new Promise(function(resolve, reject) {
                    _pending[id] = {
                        resolve: resolve,
                        reject: reject,
                        timer: window.setTimeout(function() {
                            delete _pending[id];
                            reject(new Error('The Assistant did not respond.'));
                        }, BRIDGE_TIMEOUT)
                    };
                });
                promise.requestId = id;
                Common.Gateway.requestAssistant(id, op, params || {});
                return promise;
            },

            /** Which task types the instance actually has a provider for (cached). */
            getTaskTypes: function() {
                if (!_taskTypes) {
                    _taskTypes = this.request('taskTypes').then(function(data) {
                        return data.types || {};
                    }).catch(function(err) {
                        _taskTypes = undefined;   // let a later attempt retry
                        throw err;
                    });
                }
                return _taskTypes;
            },

            /**
             * Schedule a task and wait for its result.
             * @param {String} type Nextcloud task type id
             * @param {Object} input task input map
             * @return {Promise} resolves with {taskId, output, text, html}
             */
            run: function(type, input) {
                return this.request('run', {type: type, input: input});
            },

            /**
             * Ask the host to abandon (and server-side cancel) a running task.
             * @param {String} requestId the id of the original run() request
             */
            cancel: function(requestId) {
                if (!requestId) return;
                var entry = _pending[requestId];
                if (entry) {
                    delete _pending[requestId];
                    window.clearTimeout(entry.timer);
                    entry.reject(_cancelledError());
                }
                // Sent as its own request, naming the task to abandon.
                this.request('cancel', {targetId: requestId}).catch(function() {});
            }
        };
    })();

    return Common.Assistant;
});
