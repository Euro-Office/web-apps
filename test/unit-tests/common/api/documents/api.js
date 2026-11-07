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
 *  api.js
 *
 *  Unit test: the host side of a local session in DocsAPI.DocEditor and the
 *  Gateway messages the editor frame uses for it.
 *
 *  The editor frame is replaced by fixtures/local-session/.../index.html, which
 *  echoes every command back, so the transfer of the document bytes and the
 *  command order can be observed from the harness page.
 */

define([
    '../../../../../apps/api/documents/api.js',
    '../../../../../apps/common/Gateway.js'
], function () {
    // api.js builds the frame url from this prefix: <url>apps/documenteditor/main/index.html
    var fixtureBase = new URL('./fixtures/local-session/', window.location.href).href;
    var frameOrigin = fixtureBase.split('/').slice(0, 3).join('/'); // what api.js derives from iframe.src

    var placeholders = 0;
    var alerts = [];
    var originalAlert = window.alert;

    function placeholder() {
        var id = 'api-test-placeholder-' + (++placeholders);
        var el = document.createElement('div');
        el.id = id;
        el.style.display = 'none';
        document.body.appendChild(el);
        return id;
    }

    function removePlaceholder(id) {
        var el = document.getElementById(id);
        el && el.parentNode && el.parentNode.removeChild(el);
        var frame = document.querySelector('iframe[name="frameEditor"]');
        frame && frame.parentNode && frame.parentNode.removeChild(frame);
    }

    // Collects what the fixture frame echoes back
    function FrameRecorder() {
        var me = this;
        this.commands = [];
        this.ready = false;
        this.waiters = [];
        this.listener = function (e) {
            if (!e.data || !e.data.apiTestFrame) return;
            if (e.data.ready) me.ready = true;
            if (e.data.summary) me.commands.push(e.data.summary);
            me.waiters.slice().forEach(function (w) { w(); });
        };
        window.addEventListener('message', this.listener);
    }
    FrameRecorder.prototype.waitFor = function (predicate, timeout) {
        var me = this;
        return new Promise(function (resolve, reject) {
            var timer = setTimeout(function () { reject(new Error('timeout waiting for frame, got ' + JSON.stringify(me.commands.map(function (c) { return c.command; })))); }, timeout || 5000);
            var check = function () {
                if (predicate(me)) {
                    clearTimeout(timer);
                    me.waiters.splice(me.waiters.indexOf(check), 1);
                    resolve(me);
                }
            };
            me.waiters.push(check);
            check();
        });
    };
    FrameRecorder.prototype.dispose = function () {
        window.removeEventListener('message', this.listener);
    };
    FrameRecorder.prototype.names = function () {
        return this.commands.map(function (c) { return c.command; });
    };
    FrameRecorder.prototype.find = function (name) {
        return this.commands.filter(function (c) { return c.command === name; })[0];
    };

    // Simulates a message from the editor frame to api.js
    function fromFrame(id, payload, raw) {
        payload.frameEditorId = id;
        window.dispatchEvent(new MessageEvent('message', {
            data: raw ? payload : JSON.stringify(payload),
            origin: frameOrigin
        }));
    }

    function localConfig(extra) {
        var config = {
            documentType: 'word',
            document: {title: 'report.docx', fileType: 'docx', source: {data: new Uint8Array([1, 2, 3]).buffer}},
            editorConfig: {mode: 'edit', session: {type: 'local'}, lang: 'en'},
            events: {}
        };
        return Object.assign(config, extra || {});
    }

    describe('DocsAPI.DocEditor local session', function () {
        var id, recorder, editor;

        before(function () {
            window.extensionParams = {url: fixtureBase};
            window.alert = function (msg) { alerts.push(msg); };
        });

        after(function () {
            delete window.extensionParams;
            window.alert = originalAlert;
        });

        beforeEach(function () {
            alerts.length = 0;
            id = placeholder();
            recorder = new FrameRecorder();
        });

        afterEach(function () {
            editor && editor.destroyEditor();
            editor = null;
            recorder.dispose();
            removePlaceholder(id);
        });

        it('advertises the capabilities', function () {
            assert.isTrue(DocsAPI.DocEditor.capabilities.localSession);
            assert.isTrue(DocsAPI.DocEditor.capabilities.localSessionEditing);
            assert.isTrue(DocsAPI.DocEditor.capabilities.localSessionHostTransport);
        });

        it('accepts document.source without document.url and still rejects a document without either', function () {
            editor = new DocsAPI.DocEditor(id, localConfig());
            assert.equal(alerts.length, 0);
            assert.isNotNull(document.querySelector('iframe[name="frameEditor"]'));
            editor.destroyEditor();
            editor = null;

            var config = localConfig();
            delete config.document.source;
            var other = placeholder();
            new DocsAPI.DocEditor(other, config);
            assert.equal(alerts.length, 1);
            assert.isNull(document.querySelector('iframe[name="frameEditor"]'));
            removePlaceholder(other);
        });

        function initAndOpen(config) {
            editor = new DocsAPI.DocEditor(id, config);
            return recorder.waitFor(function (r) { return r.ready; }).then(function () {
                fromFrame(id, {event: 'onAppReady'});
                return recorder.waitFor(function (r) { return r.find('openDocument'); });
            }).then(function (r) {
                return {config: r.find('init').data.config, doc: r.find('openDocument').data.doc, recorder: r};
            });
        }

        it('keeps edit mode with the self transport and turns off co-authoring, chat and history', function () {
            var config = localConfig({editorConfig: {mode: 'edit', session: {type: 'local'}, canCoAuthoring: true, callbackUrl: 'http://x/'}});
            return initAndOpen(config).then(function (res) {
                assert.equal(res.config.mode, 'edit');
                assert.equal(res.config.session.transport, 'self');
                assert.isFalse(res.config.canCoAuthoring);
                assert.isFalse(res.config.canUseHistory);
                assert.notStrictEqual(res.doc.permissions.edit, false);
                assert.isFalse(res.doc.permissions.chat);
                assert.isUndefined(res.doc.source, 'the bytes are not serialised into openDocument');
                assert.equal(res.doc.title, 'report.docx');
            });
        });

        it('keeps co-authoring with the host transport', function () {
            var config = localConfig({editorConfig: {mode: 'edit', session: {type: 'local', transport: 'host'}, coEditing: {mode: 'strict'}}});
            return initAndOpen(config).then(function (res) {
                assert.equal(res.config.mode, 'edit');
                assert.equal(res.config.session.transport, 'host');
                assert.isTrue(res.config.canCoAuthoring);
                assert.deepEqual(res.config.coEditing, {mode: 'strict'});
            });
        });

        it('falls back to the self transport for an unknown transport', function () {
            var config = localConfig({editorConfig: {mode: 'edit', session: {type: 'local', transport: 'carrier-pigeon'}}});
            return initAndOpen(config).then(function (res) {
                assert.equal(res.config.session.transport, 'self');
                assert.isFalse(res.config.canCoAuthoring);
            });
        });

        it('opens a viewer when mode is not set', function () {
            var config = localConfig({editorConfig: {session: {type: 'local'}}});
            return initAndOpen(config).then(function (res) {
                assert.equal(res.config.mode, 'view');
                assert.isFalse(res.doc.permissions.edit);
            });
        });

        it('opens a viewer when editing is not permitted', function () {
            var config = localConfig();
            config.document.permissions = {edit: false, review: true};
            return initAndOpen(config).then(function (res) {
                assert.equal(res.config.mode, 'view');
                assert.isFalse(res.doc.permissions.edit);
            });
        });

        it('keeps pdf, djvu and xps view only', function () {
            var config = localConfig();
            config.document.title = 'scan.xps';
            config.document.fileType = 'xps';
            return initAndOpen(config).then(function (res) {
                assert.equal(res.config.mode, 'view');
                assert.isFalse(res.doc.permissions.edit);
            });
        });

        it('passes indexUser and participants and drops invalid ones', function () {
            var participants = [{id: 'bob0', idOriginal: 'bob', username: 'Bob', indexUser: 0, view: false}];
            var config = localConfig({editorConfig: {mode: 'edit', session: {type: 'local', transport: 'host', indexUser: 2, participants: participants}}});
            return initAndOpen(config).then(function (res) {
                assert.equal(res.config.session.indexUser, 2);
                assert.deepEqual(res.config.session.participants, participants);
                editor.destroyEditor();
                editor = null;
                recorder.dispose();
                removePlaceholder(id);
                id = placeholder();
                recorder = new FrameRecorder();
                return initAndOpen(localConfig({editorConfig: {mode: 'edit', session: {type: 'local', indexUser: -1, participants: 'x'}}}));
            }).then(function (res) {
                assert.isUndefined(res.config.session.indexUser);
                assert.isUndefined(res.config.session.participants);
            });
        });

        it('posts format and changes of a bin source', function () {
            var config = localConfig();
            config.document.source = {data: new Uint8Array([68, 79]).buffer, format: 'bin', changes: ['["c1","c2"]']};
            return initAndOpen(config).then(function (res) {
                var source = res.recorder.find('openDocumentSource');
                assert.equal(source.format, 'bin');
                assert.deepEqual(source.changes, ['["c1","c2"]']);
            });
        });

        it('buffers session messages and media until the document was handed over', function () {
            var config = localConfig({editorConfig: {mode: 'edit', session: {type: 'local', transport: 'host'}}});
            editor = new DocsAPI.DocEditor(id, config);
            var bytes = new Uint8Array([1, 2]);
            editor.sendSessionMessage({type: 'connectState', participants: [], binary: bytes});
            editor.addSessionMedia({'image7.png': new Blob(['png'])});

            return recorder.waitFor(function (r) { return r.ready; }).then(function () {
                assert.isUndefined(recorder.find('sessionMessage'), 'nothing is posted before the frame is ready');
                fromFrame(id, {event: 'onAppReady'});
                return recorder.waitFor(function (r) { return r.find('sessionMessage') && r.find('addSessionMedia'); });
            }).then(function (r) {
                var names = r.names();
                assert.isBelow(names.indexOf('openDocument'), names.indexOf('sessionMessage'));
                var message = r.find('sessionMessage');
                assert.isTrue(message.raw, 'posted as an object');
                assert.equal(message.message.type, 'connectState');
                assert.instanceOf(message.message.binary, Uint8Array);
                editor.sendSessionMessage({type: 'getLock', locks: {}});
                return r.waitFor(function (rr) { return rr.commands.filter(function (c) { return c.command === 'sessionMessage'; }).length === 2; });
            }).then(function (r) {
                var media = r.find('addSessionMedia');
                assert.deepEqual(media.mediaNames, ['image7.png']);
                assert.isTrue(media.mediaAreBlobs);
            });
        });

        it('raises onLocalSessionSave, onLocalSessionMedia and onSessionMessage', function () {
            var saved, media, messages = [];
            editor = new DocsAPI.DocEditor(id, localConfig({events: {
                onLocalSessionSave: function (e) { saved = e.data; },
                onLocalSessionMedia: function (e) { media = e.data; },
                onSessionMessage: function (e) { messages.push(e.data); }
            }}));
            var blob = new Blob(['docx']), image = new Blob(['png'], {type: 'image/png'});

            fromFrame(id, {event: 'onLocalSessionSave', data: {blob: blob, fileType: 'docx'}}, true);
            fromFrame(id, {event: 'onLocalSessionMedia', data: {name: 'image_1.png', blob: image}}, true);
            fromFrame(id, {event: 'onSessionMessage', data: {type: 'saveChanges', changes: '["x"]'}}, true);

            assert.equal(saved.blob, blob);
            assert.equal(saved.fileType, 'docx');
            assert.deepEqual(media, {name: 'image_1.png', blob: image});
            assert.deepEqual(messages, [{type: 'saveChanges', changes: '["x"]'}]);
        });

        function expectSourceTransfer(data, expectedBytes, media) {
            var config = localConfig();
            config.document.source = {data: data, media: media};
            editor = new DocsAPI.DocEditor(id, config);

            return recorder.waitFor(function (r) { return r.ready; }).then(function () {
                fromFrame(id, {event: 'onAppReady'});
                return recorder.waitFor(function (r) { return r.find('openDocument'); });
            }).then(function (r) {
                var names = r.names();
                assert.isBelow(names.indexOf('init'), names.indexOf('openDocumentSource'));
                assert.isBelow(names.indexOf('openDocumentSource'), names.indexOf('openDocument'));
                var source = r.find('openDocumentSource');
                assert.isTrue(source.raw, 'posted as a raw object');
                assert.isTrue(source.isArrayBuffer);
                assert.equal(source.byteLength, expectedBytes.length);
                assert.deepEqual(source.bytes, expectedBytes);
                assert.equal(source.name, 'report.docx');
                assert.equal(source.fileType, 'docx');
                return source;
            });
        }

        it('transfers an ArrayBuffer source before openDocument', function () {
            var buffer = new Uint8Array([10, 11, 12, 13]).buffer;
            return expectSourceTransfer(buffer, [10, 11, 12, 13]).then(function () {
                assert.equal(buffer.byteLength, 0, 'the host buffer is detached, i.e. it was in the transfer list');
            });
        });

        it('transfers a typed array source', function () {
            var backing = new Uint8Array([0, 0, 20, 21, 22, 0]);
            var view = backing.subarray(2, 5);
            return expectSourceTransfer(view, [20, 21, 22]).then(function () {
                assert.equal(backing.byteLength, 6, 'the caller\'s buffer stays intact');
            });
        });

        it('transfers a Blob source and forwards pre-extracted media', function () {
            var blob = new Blob([new Uint8Array([30, 31])]);
            return expectSourceTransfer(blob, [30, 31], {'image1.png': new Blob(['png'])}).then(function (source) {
                assert.deepEqual(source.mediaNames, ['image1.png']);
                assert.isTrue(source.mediaAreBlobs);
            });
        });

        it('hands a downloaded Blob to the integrator with an object url', function () {
            var received;
            var config = localConfig({events: {onDownloadAs: function (e) { received = e.data; }}});
            editor = new DocsAPI.DocEditor(id, config);
            var blob = new Blob(['pdf'], {type: 'application/pdf'});

            fromFrame(id, {event: 'onDownloadAs', data: {blob: blob, fileType: 'pdf'}}, true);

            assert.isOk(received);
            assert.equal(received.blob, blob);
            assert.equal(received.fileType, 'pdf');
            assert.match(received.url, /^blob:/);
        });

        it('forwards progress and local session error codes', function () {
            var progress = [], errors = [];
            var config = localConfig({events: {
                onLocalSessionProgress: function (e) { progress.push(e.data); },
                onError: function (e) { errors.push(e.data.errorCode); }
            }});
            editor = new DocsAPI.DocEditor(id, config);

            fromFrame(id, {event: 'onLocalSessionProgress', data: {phase: 'convert', percent: 40}});
            [-100, -101, -102, -103].forEach(function (code) {
                fromFrame(id, {event: 'onError', data: {errorCode: code, errorDescription: 'x'}});
            });

            assert.deepEqual(progress, [{phase: 'convert', percent: 40}]);
            assert.deepEqual(errors, [-100, -101, -102, -103]);
        });

        it('reports an unusable source through onError instead of posting it', function () {
            var errors = [];
            var config = localConfig({events: {onError: function (e) { errors.push(e.data); }}});
            config.document.source = {data: 'not bytes'};
            editor = new DocsAPI.DocEditor(id, config);

            return recorder.waitFor(function (r) { return r.ready; }).then(function () {
                fromFrame(id, {event: 'onAppReady'});
                return recorder.waitFor(function (r) { return r.find('init'); });
            }).then(function () {
                return new Promise(function (resolve) { setTimeout(resolve, 50); });
            }).then(function () {
                assert.equal(errors.length, 1);
                assert.equal(errors[0].errorCode, -101);
                assert.isUndefined(recorder.find('openDocumentSource'));
                assert.isUndefined(recorder.find('openDocument'));
            });
        });
    });

    describe('Common.Gateway local session messages', function () {
        // Gateway posts to window.parent, which is this page: listen for its own messages
        function nextMessage(predicate) {
            return new Promise(function (resolve) {
                var listener = function (e) {
                    if (predicate(e.data)) {
                        window.removeEventListener('message', listener);
                        resolve(e.data);
                    }
                };
                window.addEventListener('message', listener);
            });
        }

        it('posts downloadAsBlob as a raw object carrying the Blob', function () {
            var blob = new Blob(['docx']);
            var wait = nextMessage(function (d) { return d && typeof d === 'object' && d.event === 'onDownloadAs'; });
            Common.Gateway.downloadAsBlob(blob, 'docx');
            return wait.then(function (msg) {
                assert.equal(msg.data.fileType, 'docx');
                assert.instanceOf(msg.data.blob, Blob);
                assert.isTrue('frameEditorId' in msg);
            });
        });

        it('posts localSessionProgress as the onLocalSessionProgress event', function () {
            var wait = nextMessage(function (d) { return typeof d === 'string' && d.indexOf('onLocalSessionProgress') > -1; });
            Common.Gateway.localSessionProgress('load', 100);
            return wait.then(function (msg) {
                assert.deepEqual(JSON.parse(msg), {event: 'onLocalSessionProgress', data: {phase: 'load', percent: 100}});
            });
        });

        it('posts saves, media and session messages as raw objects', function () {
            var blob = new Blob(['x']);
            var wait = nextMessage(function (d) { return d && typeof d === 'object' && d.event === 'onLocalSessionSave'; });
            Common.Gateway.localSessionSave(blob, 'xlsx');
            return wait.then(function (msg) {
                assert.equal(msg.data.fileType, 'xlsx');
                assert.instanceOf(msg.data.blob, Blob);
                wait = nextMessage(function (d) { return d && typeof d === 'object' && d.event === 'onLocalSessionMedia'; });
                Common.Gateway.localSessionMedia('image_1.png', blob);
                return wait;
            }).then(function (msg) {
                assert.equal(msg.data.name, 'image_1.png');
                assert.instanceOf(msg.data.blob, Blob);
                wait = nextMessage(function (d) { return d && typeof d === 'object' && d.event === 'onSessionMessage'; });
                Common.Gateway.sessionMessage({type: 'getLock', block: ['b1']});
                return wait;
            }).then(function (msg) {
                assert.deepEqual(msg.data, {type: 'getLock', block: ['b1']});
            });
        });

        it('dispatches raw sessionMessage and addSessionMedia commands unchanged', function () {
            var messages = [], media = [];
            Common.Gateway.on('sessionmessage', function (data) { messages.push(data); });
            Common.Gateway.on('addsessionmedia', function (data) { media.push(data); });
            var message = {type: 'connectState', participants: [{id: 'b0'}]};
            var images = {'image7.png': new Blob(['png'])};
            window.dispatchEvent(new MessageEvent('message', {data: {command: 'sessionMessage', data: message}, origin: window.location.origin}));
            window.dispatchEvent(new MessageEvent('message', {data: {command: 'addSessionMedia', data: images}, origin: window.location.origin}));
            assert.deepEqual(messages, [message]);
            assert.deepEqual(media, [images]);
        });

        it('dispatches the raw openDocumentSource command', function () {
            var received;
            Common.Gateway.on('opendocumentsource', function (data) { received = data; });
            var buffer = new Uint8Array([7, 8]).buffer;
            window.dispatchEvent(new MessageEvent('message', {
                data: {command: 'openDocumentSource', data: {buffer: buffer, name: 'a.docx', fileType: 'docx'}},
                origin: window.location.origin
            }));
            assert.isOk(received);
            assert.equal(received.name, 'a.docx');
            assert.equal(received.buffer, buffer);
        });
    });
});
