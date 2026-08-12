/*
 * Native Nextcloud Assistant dialog.
 *
 * Replaces the embedded Nextcloud modal with editor-native UI. The action list
 * is built from the task types the instance actually has a provider for, so the
 * dialog never offers something that would fail.
 *
 * The result comes back as HTML (the integration converts the model's Markdown)
 * so it can be inserted with formatting intact, with plain text as a fallback.
 * OK runs the action; once there is a result, OK inserts it.
 */
define([
    'common/main/lib/component/Window',
    'common/main/lib/component/ComboBox',
    'common/main/lib/component/TextareaField',
    'common/main/lib/util/Assistant'
], function () { 'use strict';

    Common.Views = Common.Views || {};

    Common.Views.AssistantDialog = Common.UI.Window.extend(_.extend({

        initialize: function(options) {
            var _options = {};
            _.extend(_options, {
                title: this.txtTitle,
                width: 460,
                height: 'auto',
                cls: 'modal-dlg',
                buttons: ['ok', 'cancel']
            }, options || {});

            this.template = [
                '<div class="box">',
                    '<div class="input-row"><label>' + this.txtAction + '</label></div>',
                    '<div id="assistant-action" class="input-row" style="margin-bottom: 12px;"></div>',
                    '<div class="input-row"><label id="assistant-input-label">' + this.txtInput + '</label></div>',
                    '<div id="assistant-input" class="input-row"></div>',
                    '<div id="assistant-status" class="input-row" style="margin-top: 8px; min-height: 18px;"></div>',
                '</div>'
            ].join('');

            _options.tpl = _.template(this.template)(_options);

            this.handler = _options.handler;
            this.selection = _options.selection || '';
            this.taskTypes = _options.taskTypes || {};
            this._requestId = null;
            this._result = null;

            Common.UI.Window.prototype.initialize.call(this, _options);
        },

        render: function() {
            Common.UI.Window.prototype.render.call(this);
            var me = this;
            if (!me.$window) return me;

            // Delegated, and bound before anything else can throw: the footer
            // buttons are re-wrapped as Common.UI.Button elsewhere, which
            // replaces the nodes and would drop a handler bound directly to them.
            me.$btnOk = me.$window.find('.dlg-btn[result="ok"]');
            me.$window.off('click.assistant').on('click.assistant', '.dlg-btn', function(e) {
                me.onBtnClick(e);
            });

            me.cmbAction = new Common.UI.ComboBox({
                el: $('#assistant-action', me.$window),
                cls: 'input-group-nr',
                menuStyle: 'min-width: 100%; max-height: 210px;',
                editable: false,
                takeFocusOnClose: true,
                data: me._buildActionList()
            });
            if (me.cmbAction.store.length) {
                me.cmbAction.setValue(me.cmbAction.store.at(0).get('value'));
            }

            me.textInput = new Common.UI.TextareaField({
                el: $('#assistant-input', me.$window),
                style: 'width: 100%; height: 110px;',
                value: me.selection,
                resize: false
            });

            me.$status = $('#assistant-status', me.$window);

            if (!me.cmbAction.store.length) {
                me._setStatus(me.txtNoActions, true);
                me.$btnOk.attr('disabled', true).addClass('disabled');
            }

            return me;
        },

        /**
         * Build the action list from what the instance actually provides.
         *
         * Each action prefers its purpose-built Nextcloud task type: a provider
         * can specialise for it, and admins enable or disable task types
         * individually. Those types take a bare `input`: Text, so the editor can
         * supply everything they need. Where a type has no provider on this
         * instance we fall back to the free-prompt type and carry the
         * instruction in the prompt, so the action still works.
         *
         * Types needing extra structured input are deliberately excluded until
         * the dialog can collect it -- translate needs origin/target language
         * enums, changetone needs a tone.
         */
        _buildActionList: function() {
            var types = this.taskTypes || {},
                list = [],
                FREE = 'core:text2text';

            var add = function(value, display, preferredType, prompt) {
                if (types[preferredType]) {
                    // The task type *is* the instruction, so no prompt is needed.
                    list.push({value: value, displayValue: display, taskType: preferredType, prompt: ''});
                } else if (types[FREE]) {
                    list.push({value: value, displayValue: display, taskType: FREE, prompt: prompt});
                }
            };

            add('summarize', this.txtSummarize, 'core:text2text:summary',
                'Summarize the following text. Reply with the summary only.');
            add('rewrite', this.txtRewrite, 'core:text2text:reformulation',
                'Rewrite the following text so it reads better, keeping its meaning. Reply with the rewritten text only.');
            add('shorter', this.txtShorter, 'core:text2text:simplification',
                'Make the following text simpler and shorter, keeping its meaning. Reply with the result only.');
            add('proofread', this.txtProofread, 'core:text2text:proofread',
                'Correct spelling and grammar in the following text. Reply with the corrected text only and change nothing else.');
            add('headline', this.txtHeadline, 'core:text2text:headline',
                'Write a headline for the following text. Reply with the headline only.');
            add('topics', this.txtTopics, 'core:text2text:topics',
                'List the main topics of the following text, comma separated. Reply with the list only.');

            // No Nextcloud task type expands text, so this one is prompt-only.
            if (types[FREE]) {
                list.push({value: 'longer', displayValue: this.txtLonger, taskType: FREE,
                    prompt: 'Expand the following text with more detail. Reply with the expanded text only.'});
                list.push({value: 'prompt', displayValue: this.txtFreePrompt, taskType: FREE, prompt: ''});
            }

            return list;
        },

        onBtnClick: function(event) {
            this._handleInput(event.currentTarget.attributes['result'].value);
        },

        onPrimary: function() {
            this._handleInput('ok');
            return false;
        },

        onToolClose: function() {
            this._handleInput('cancel');
        },

        _handleInput: function(state) {
            if (state !== 'ok') {
                this._abort();
                this.close();
                return;
            }

            if (this._result) {                 // second OK = insert
                var result = this._result;
                this.close();
                if (this.handler) {
                    this.handler.call(this, 'insert', result);
                }
                return;
            }

            this._run();
        },

        _run: function() {
            var me = this,
                rec = me.cmbAction.getSelectedRecord();
            if (!rec) return;

            var text = me.textInput.getValue() || '',
                prompt = rec.get('prompt'),
                input = prompt ? (prompt + '\n\n' + text) : text;

            if (!input.replace(/\s/g, '')) {
                me._setStatus(me.txtNeedInput, true);
                return;
            }

            me._setBusy(true);
            me._setStatus(me.txtWorking, false);

            var promise = Common.Assistant.run(rec.get('taskType'), {input: input});
            me._requestId = promise.requestId;

            promise.then(function(data) {
                me._requestId = null;
                me._setBusy(false);
                if (!data || !data.text) {
                    me._setStatus(me.txtNoResult, true);
                    return;
                }
                me._result = data;
                me.textInput.setValue(data.text);
                me._setStatus(me.txtDone, false);
                me.$btnOk.text(me.txtInsert);
            }).catch(function(err) {
                me._requestId = null;
                me._setBusy(false);
                if (!err || !err.cancelled) {
                    me._setStatus((err && err.message) || me.txtFailed, true);
                }
            });
        },

        /** Never leave a task running that nobody is waiting for. */
        _abort: function() {
            if (this._requestId) {
                Common.Assistant.cancel(this._requestId);
                this._requestId = null;
            }
        },

        close: function() {
            this._abort();
            Common.UI.Window.prototype.close.apply(this, arguments);
        },

        _setBusy: function(busy) {
            this.cmbAction && this.cmbAction.setDisabled(busy);
            if (this.$btnOk) {
                this.$btnOk.attr('disabled', !!busy);
                this.$btnOk.toggleClass('disabled', !!busy);
            }
        },

        _setStatus: function(message, isError) {
            if (!this.$status) return;
            this.$status.css('color', isError ? '#d9534f' : '');
            this.$status.text(message || '');
        },

        txtTitle: 'Nextcloud Assistant',
        txtAction: 'Action',
        txtInput: 'Text',
        txtSummarize: 'Summarize',
        txtRewrite: 'Rewrite',
        txtShorter: 'Make shorter',
        txtLonger: 'Make longer',
        txtProofread: 'Fix spelling & grammar',
        txtFreePrompt: 'Ask the Assistant',
        txtHeadline: 'Generate a headline',
        txtTopics: 'Extract topics',
        txtWorking: 'Working...',
        txtDone: 'Ready to insert.',
        txtInsert: 'Insert',
        txtNoResult: 'The Assistant returned nothing.',
        txtNoActions: 'No Assistant provider is configured on this server.',
        txtNeedInput: 'Enter some text first.',
        txtFailed: 'The Assistant request failed.'

    }, Common.Views.AssistantDialog || {}));

    /**
     * Insert an Assistant result into the document.
     *
     * Prefers HTML so headings, lists and emphasis survive; falls back to plain
     * text. pluginMethod_PasteHtml silently no-ops while a previous paste is
     * still on screen (it guards on the #pmpastehtml element), so retry briefly
     * rather than losing the result.
     *
     * @param {Object} api the editor api
     * @param {Object} result {html, text} as returned by the integration
     * @param {Number} attempt internal retry counter
     */
    Common.Views.AssistantDialog.insertResult = function(api, result, attempt) {
        if (!api || !result) return;
        attempt = attempt || 0;

        var html = result.html,
            text = result.text || '';

        if (html && typeof api['pluginMethod_PasteHtml'] === 'function') {
            if (document.getElementById('pmpastehtml')) {
                if (attempt < 20) {
                    setTimeout(function() {
                        Common.Views.AssistantDialog.insertResult(api, result, attempt + 1);
                    }, 100);
                    return;
                }
            }
            api['pluginMethod_PasteHtml'](html);
        } else if (typeof api['pluginMethod_PasteText'] === 'function') {
            api['pluginMethod_PasteText'](text);
        }

        Common.NotificationCenter.trigger('edit:complete');
    };

    /**
     * Open the Assistant, having first asked the host which task types exist.
     *
     * @param {Object} options {api, selection}
     */
    Common.Views.AssistantDialog.open = function(options) {
        var api = options.api,
            selection = options.selection || '';

        Common.Assistant.getTaskTypes().then(function(types) {
            var dlg = new Common.Views.AssistantDialog({
                taskTypes: types,
                selection: selection,
                handler: function(state, result) {
                    if (state === 'insert') {
                        Common.Views.AssistantDialog.insertResult(api, result);
                    }
                }
            });
            dlg.show();
        }).catch(function(err) {
            Common.UI.warning({
                msg: (err && err.message) || 'The Nextcloud Assistant is unavailable.',
                callback: function() {
                    Common.NotificationCenter.trigger('edit:complete');
                }
            });
        });
    };
});
