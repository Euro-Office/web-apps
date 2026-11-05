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
 *  Unit test: drives Common.LocalSession.Session through the auth/documentOpen
 *  exchange with a stub converter and a fake sdkjs transport consumer.
 */

define([
    'common/main/lib/util/LocalSession',
    'common/main/lib/util/localsession/desktop'
], function () {
    var Session = Common.LocalSession.Session;
    var ERRORS = Common.LocalSession.ERRORS;

    function bytes(text) {
        return new TextEncoder().encode(text);
    }

    // Converter stub implementing contract section 3
    function stubConverter(options) {
        options = options || {};
        var calls = [];
        var module = {
            calls: calls,
            createConverter: function () {
                return Promise.resolve({
                    convert: function (request) {
                        calls.push(request);
                        if (options.fail)
                            return Promise.reject(options.fail);
                        if (request.to === 'bin')
                            return Promise.resolve({data: bytes('DOCY;bin'), media: {'image1.png': bytes('png')}});
                        return Promise.resolve({data: bytes('export ' + request.to), media: {}});
                    },
                    terminate: function () { module.terminated = true; }
                });
            }
        };
        return module;
    }

    function createSession(converter, extra) {
        var created = [], revoked = [], errors = [], progress = [];
        var session = new Session(Object.assign({
            loadConverter: function () { return Promise.resolve(converter); },
            x2tUrl: 'x2t/',
            getVersion: function () { return {buildVersion: '9.3.8', buildNumber: 42}; },
            user: {id: 'uid-1', name: 'Alice'},
            documentType: 'word',
            onError: function (code, message) { errors.push({code: code, message: message}); },
            onProgress: function (phase, percent) { progress.push(phase + ':' + percent); },
            createObjectURL: function (blob) { var url = 'blob:test/' + created.length; created.push({url: url, blob: blob}); return url; },
            revokeObjectURL: function (url) { revoked.push(url); }
        }, extra || {}));
        return {session: session, created: created, revoked: revoked, errors: errors, progress: progress};
    }

    // Pretend to be sdkjs: connect, then send auth once the license arrived
    function runAuthExchange(transport, openCmd) {
        return new Promise(function (resolve) {
            var received = [];
            transport.connect({
                onOpen: function () { received.push({type: '<open>'}); },
                onMessage: function (msg) {
                    received.push(msg);
                    if (msg.type === 'license')
                        transport.send({type: 'auth', openCmd: openCmd || {c: 'open', format: 'docx', nobase64: true}});
                    if (msg.type === 'documentOpen')
                        resolve(received);
                },
                onClose: function () { received.push({type: '<close>'}); },
                onDisconnect: function () { received.push({type: '<disconnect>'}); }
            });
        });
    }

    describe('Common.LocalSession.Session', function () {
        it('answers auth with license, authChanges, auth and documentOpen built from the converted source', function () {
            var converter = stubConverter();
            var t = createSession(converter);
            var transport = t.session.getTransport();
            t.session.setSource({buffer: bytes('docx bytes').buffer, name: 'report.docx', fileType: 'docx'});

            return runAuthExchange(transport).then(function (received) {
                var types = received.map(function (m) { return m.type; });
                assert.deepEqual(types, ['<open>', 'license', 'authChanges', 'auth', 'documentOpen']);

                var license = received[1].license;
                assert.equal(license.type, 3);
                assert.equal(license.buildVersion, '9.3.8');
                assert.equal(license.buildNumber, 42);

                var auth = received[3];
                assert.equal(auth.result, 1);
                assert.equal(auth.indexUser, 0);
                assert.equal(auth.licenseType, 3);
                assert.equal(auth.buildVersion, '9.3.8');
                assert.equal(auth.participants.length, 1);
                assert.equal(auth.participants[0].id, 'uid-10');
                assert.equal(auth.participants[0].username, 'Alice');
                assert.isTrue(auth.participants[0].view);

                var open = received[4].data;
                assert.equal(open.type, 'open');
                assert.equal(open.status, 'ok');
                assert.equal(open.data['Editor.bin'], 'blob:test/0');
                assert.equal(open.data['media/image1.png'], 'blob:test/1');

                assert.equal(converter.calls.length, 1);
                assert.equal(converter.calls[0].to, 'bin');
                assert.equal(converter.calls[0].fileName, 'report.docx');
                assert.equal(converter.calls[0].type, 'word');
                assert.isTrue(converter.calls[0].options.noBase64);
                assert.include(t.progress, 'convert:100');
                assert.include(t.progress, 'open:100');
                assert.equal(t.errors.length, 0);
            });
        });

        it('waits for the source when auth arrives first', function () {
            var converter = stubConverter();
            var t = createSession(converter);
            var transport = t.session.getTransport();
            var exchange = runAuthExchange(transport);

            setTimeout(function () {
                t.session.setSource({buffer: bytes('late').buffer, name: 'late.docx'});
            }, 10);

            return exchange.then(function (received) {
                assert.equal(received[received.length - 1].data.status, 'ok');
                assert.equal(converter.calls[0].fileName, 'late.docx');
            });
        });

        it('serves viewer formats as origin files without conversion', function () {
            var converter = stubConverter();
            var t = createSession(converter, {documentType: 'pdf'});
            t.session.setSource({buffer: bytes('%PDF').buffer, name: 'scan.pdf', fileType: 'pdf'});

            return runAuthExchange(t.session.getTransport(), {c: 'open', format: 'pdf'}).then(function (received) {
                var open = received[received.length - 1].data;
                assert.equal(open.status, 'ok');
                assert.equal(open.data['origin.pdf'], 'blob:test/0');
                assert.isUndefined(open.data['Editor.bin']);
                assert.equal(converter.calls.length, 0);
                assert.equal(t.created[0].blob.type, 'application/pdf');
            });
        });

        it('reports a conversion failure to the host and to sdkjs', function () {
            var converter = stubConverter({fail: {code: 'unsupported', message: 'nope'}});
            var t = createSession(converter);
            t.session.setSource({buffer: bytes('x').buffer, name: 'file.xyz'});

            return runAuthExchange(t.session.getTransport()).then(function (received) {
                var open = received[received.length - 1].data;
                assert.equal(open.status, 'err');
                assert.equal(t.errors.length, 1);
                assert.equal(t.errors[0].code, ERRORS.Unsupported);
                assert.equal(t.errors[0].message, 'nope');
            });
        });

        it('reports a converter load failure with the load error code', function () {
            var t = createSession(null, {loadConverter: function () { return Promise.reject(new Error('404')); }});
            t.session.setSource({buffer: bytes('x').buffer, name: 'file.docx'});

            return runAuthExchange(t.session.getTransport()).then(function (received) {
                assert.equal(received[received.length - 1].data.status, 'err');
                assert.equal(t.errors[0].code, ERRORS.Load);
                assert.equal(t.errors[0].message, '404');
            });
        });

        it('answers image url requests from the extracted media', function () {
            var converter = stubConverter();
            var t = createSession(converter);
            var transport = t.session.getTransport();
            t.session.setSource({buffer: bytes('docx').buffer, name: 'a.docx'});

            return runAuthExchange(transport).then(function () {
                return new Promise(function (resolve) {
                    t.session.handlers.onMessage = function (msg) { resolve(msg); };
                    transport.send({type: 'rpc', responseKey: 7, data: {c: 'imgurls', data: ['image1.png', 'missing.png']}});
                });
            }).then(function (reply) {
                assert.equal(reply.type, 'rpc');
                assert.equal(reply.responseKey, 7);
                assert.equal(reply.data.status, 'ok');
                assert.deepEqual(reply.data.data, ['blob:test/1', 'missing.png']);

                return new Promise(function (resolve) {
                    t.session.handlers.onMessage = function (msg) { resolve(msg); };
                    transport.send({type: 'openDocument', message: {c: 'imgurls', data: ['image1.png']}});
                });
            }).then(function (reply) {
                assert.equal(reply.type, 'documentOpen');
                assert.equal(reply.data.type, 'imgurls');
                assert.deepEqual(reply.data.data.urls, [{path: 'image1.png', url: 'blob:test/1'}]);
            });
        });

        it('answers isSaveLock and ignores messages nobody waits for', function () {
            var t = createSession(stubConverter());
            var transport = t.session.getTransport();
            var messages = [];
            transport.connect({onOpen: function () {}, onMessage: function (m) { messages.push(m); }, onClose: function () {}, onDisconnect: function () {}});

            return new Promise(function (resolve) { setTimeout(resolve, 5); }).then(function () {
                messages.length = 0;
                transport.send({type: 'isSaveLock'});
                transport.send({type: 'cursor', cursor: ''});
                transport.send({type: 'message', message: 'hi'});
                transport.send({type: 'getMessages'});
                transport.send({type: 'extendSession', idletime: 5});
                transport.send({type: 'authChangesAck'});
                assert.deepEqual(messages, [{type: 'saveLock', saveLock: false}]);
            });
        });

        it('converts the editor binary for downloads and keeps the blob for the host', function (done) {
            var converter = stubConverter();
            var t = createSession(converter, {getFonts: function () { return {'Arial.ttf': 'fonts/arial'}; }});
            t.session.setSource({buffer: bytes('docx').buffer, name: 'a.docx'});

            runAuthExchange(t.session.getTransport()).then(function () {
                t.session.getTransport().convert({
                    data: 'DOCY;v10;bin',
                    fileType: 0x0041,
                    format: 'docx',
                    title: 'a.docx',
                    isPrint: false,
                    options: {nobase64: true, outputformat: 0x0041}
                }, function (result) {
                    try {
                        assert.equal(result.status, 'ok');
                        assert.equal(result.filetype, 'docx');
                        assert.equal(result.data, 'blob:test/2');
                        assert.equal(t.session.getBlob('blob:test/2'), t.created[2].blob);
                        assert.equal(t.session.getFileType('blob:test/2'), 'docx');
                        assert.equal(t.created[2].blob.type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                        var request = converter.calls[1];
                        assert.equal(request.to, 'docx');
                        assert.equal(request.fileName, 'document.bin');
                        assert.equal(request.type, 'word');
                        assert.deepEqual(request.fonts, {'Arial.ttf': 'fonts/arial'});
                        assert.isTrue(request.options.noBase64);
                        assert.isTrue(Object.prototype.hasOwnProperty.call(request.media, 'image1.png'));
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });
        });

        it('exports pdf for print requests and maps numeric file types', function (done) {
            var converter = stubConverter();
            var t = createSession(converter);
            t.session.setSource({buffer: bytes('docx').buffer, name: 'a.docx'});

            runAuthExchange(t.session.getTransport()).then(function () {
                t.session.getTransport().convert({data: new Uint8Array([1]), fileType: 0x0041, isPrint: true}, function (result) {
                    try {
                        assert.equal(result.status, 'ok');
                        assert.equal(result.filetype, 'pdf');
                        assert.equal(converter.calls[1].to, 'pdf');
                        assert.isTrue(converter.calls[1].options.isPrint);
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });
        });

        it('rejects downloads with an unknown format', function (done) {
            var t = createSession(stubConverter());
            t.session.getTransport().convert({data: 'x', fileType: 0x9999}, function (result) {
                try {
                    assert.equal(result.status, 'err');
                    assert.equal(result.error, ERRORS.Unsupported);
                    assert.equal(t.errors[0].code, ERRORS.Unsupported);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('revokes urls and terminates the converter on close without calling back into sdkjs', function () {
            var converter = stubConverter();
            var t = createSession(converter);
            t.session.setSource({buffer: bytes('docx').buffer, name: 'a.docx'});
            var closed = [];

            return new Promise(function (resolve) {
                var transport = t.session.getTransport();
                transport.connect({
                    onOpen: function () {},
                    onMessage: function (msg) {
                        if (msg.type === 'license')
                            transport.send({type: 'auth', openCmd: {}});
                        if (msg.type === 'documentOpen')
                            resolve();
                    },
                    onClose: function (explicit) { closed.push(explicit); },
                    onDisconnect: function () {}
                });
            }).then(function () {
                t.session.getTransport().close();
                assert.isTrue(t.session.isClosed());
                assert.deepEqual(closed, [], 'the sdkjs adapter closes its own side first');
                assert.sameMembers(t.revoked, ['blob:test/0', 'blob:test/1']);
                assert.isTrue(converter.terminated);
                // messages after close are dropped
                var messages = [];
                t.session.handlers = {onMessage: function (m) { messages.push(m); }};
                t.session.getTransport().send({type: 'isSaveLock'});
                assert.equal(messages.length, 0);
            });
        });
    });

    describe('Common.LocalSession.Host', function () {
        var Host = Common.LocalSession.Host;
        var savedAscCommon;

        beforeEach(function () {
            savedAscCommon = window.AscCommon;
        });

        afterEach(function () {
            window.AscCommon = savedAscCommon;
        });

        function fakeGateway() {
            var handlers = {};
            return {
                handlers: handlers,
                reported: [],
                progress: [],
                on: function (event, fn) { handlers[event] = fn; },
                reportError: function (code, text) { this.reported.push({code: code, text: text}); },
                localSessionProgress: function (phase, percent) { this.progress.push(phase + ':' + percent); }
            };
        }

        function fakeSdk() {
            var sdk = {transport: undefined};
            window.AscCommon = {setLocalSessionTransport: function (t) { sdk.transport = t; }};
            return sdk;
        }

        function createHost(gateway, converter, extra) {
            return new Host(Object.assign({
                gateway: gateway,
                loadConverter: function () { return Promise.resolve(converter); },
                getFonts: function () { return {}; },
                getVersion: function () { return {buildVersion: '9.3.8', buildNumber: 42}; },
                messages: {convert: 'Konvertierung fehlgeschlagen'}
            }, extra || {}));
        }

        it('reports a missing sdkjs hook instead of starting', function () {
            window.AscCommon = {};
            var gateway = fakeGateway(), shown = [];
            var host = createHost(gateway, stubConverter(), {onError: function (code, text) { shown.push(text); }});

            assert.isFalse(host.start({documentType: 'word'}));
            assert.deepEqual(gateway.reported, [{code: ERRORS.Load, text: 'This editor build cannot open documents without a Document Server.'}]);
            assert.deepEqual(shown, ['This editor build cannot open documents without a Document Server.']);
        });

        it('keeps a source that arrives before start and opens it through the registered transport', function () {
            var gateway = fakeGateway(), sdk = fakeSdk();
            var host = createHost(gateway, stubConverter());
            host.listen();
            gateway.handlers.opendocumentsource({buffer: bytes('PK docx').buffer, name: 'a.docx', fileType: 'docx'});

            assert.isTrue(host.start({documentType: 'word', user: {id: 'u1', fullname: 'Alice'}, x2tUrl: 'x2t/'}));
            assert.isObject(sdk.transport);
            assert.isTrue(host.isActive());

            return runAuthExchange(sdk.transport).then(function (received) {
                var open = received[received.length - 1];
                assert.equal(open.data.status, 'ok');
                assert.include(gateway.progress.join(' '), 'convert:');
            });
        });

        it('maps session errors to the localized messages', function () {
            var gateway = fakeGateway(), sdk = fakeSdk();
            var host = createHost(gateway, stubConverter({fail: {code: 'convert', message: 'broken'}}));
            host.listen();
            host.start({documentType: 'word'});
            gateway.handlers.opendocumentsource({buffer: bytes('x').buffer, name: 'a.docx', fileType: 'docx'});

            return new Promise(function (resolve) {
                sdk.transport.connect({
                    onOpen: function () {},
                    onMessage: function (msg) {
                        if (msg.type === 'license')
                            sdk.transport.send({type: 'auth', openCmd: {}});
                    },
                    onClose: function () {},
                    onDisconnect: function () { resolve(); }
                });
                setTimeout(resolve, 200);
            }).then(function () {
                assert.deepEqual(gateway.reported, [{code: ERRORS.Convert, text: 'Konvertierung fehlgeschlagen'}]);
            });
        });

        it('exports on every user save but not on autosave, and relays through the gateway', function () {
            var gateway = fakeGateway(), sdk = fakeSdk();
            gateway.saved = []; gateway.toHost = []; gateway.media = [];
            gateway.localSessionSave = function (blob, fileType) { this.saved.push(fileType); };
            gateway.sessionMessage = function (m) { this.toHost.push(m); };
            gateway.localSessionMedia = function (name) { this.media.push(name); };
            var savedAsc = window.Asc;
            var downloads = [], saves = [];
            function DownloadOptions(type) { this.type = type; }
            DownloadOptions.prototype.asc_setIsDownloadEvent = function (v) { this.isDownloadEvent = v; };
            window.Asc = {c_oAscFileType: {DOCX: 0x0041, XLSX: 0x0101}, asc_CDownloadOptions: DownloadOptions};
            var api = {
                asc_Save: function (isAutoSave) { saves.push(!!isAutoSave); return true; },
                asc_DownloadAs: function (options) {
                    downloads.push(options);
                    sdk.transport.convert({data: 'DOCY', format: 'xlsx', fileType: options.type}, function () {});
                }
            };
            var host = createHost(gateway, stubConverter());
            host.listen();
            gateway.handlers.sessionmessage({type: 'connectState', participants: []});
            gateway.handlers.opendocumentsource({buffer: bytes('x').buffer, name: 'a.xls', fileType: 'xls'});
            host.start({documentType: 'cell', api: api, mode: 'edit', fileType: 'xls', user: {id: 'u'},
                session: {type: 'local', transport: 'host', indexUser: 3}});

            return runAuthExchange(sdk.transport).then(function () {
                assert.deepEqual(gateway.toHost.map(function (m) { return m.type; }), ['sessionAuth']);
                assert.equal(gateway.toHost[0].connectionId, 'u3');
                api.asc_Save(true);
                assert.equal(downloads.length, 0, 'autosave exports nothing');
                api.asc_Save();
                assert.deepEqual(saves, [true, false]);
                assert.equal(downloads.length, 1);
                assert.equal(downloads[0].type, 0x0101);
                assert.isTrue(downloads[0].isDownloadEvent);
                return new Promise(function (resolve) { setTimeout(resolve, 20); });
            }).then(function () {
                assert.deepEqual(gateway.saved, ['xlsx']);
                host.stop();
                api.asc_Save();
                assert.equal(downloads.length, 1, 'no export after stop');
            }).finally(function () {
                window.Asc = savedAsc;
            });
        });

        it('does not watch saves in a viewer', function () {
            var gateway = fakeGateway(), sdk = fakeSdk();
            var api = {asc_Save: function () { return true; }};
            var original = api.asc_Save;
            var host = createHost(gateway, stubConverter());
            host.start({documentType: 'word', api: api, mode: 'view'});
            assert.equal(api.asc_Save, original);
            assert.isFalse(host.session.isEditing());
        });

        it('creates the desktop host with the localized texts and warns when unsupported', function () {
            var saved = {Gateway: Common.Gateway, Controllers: Common.Controllers, UI: Common.UI};
            var gateway = fakeGateway(), warnings = [];
            window.AscCommon = {};
            Common.Gateway = gateway;
            Common.Controllers = {LocalSession: {errorNotSupported: 'Nicht unterstuetzt', errorConvert: 'Konvertierung fehlgeschlagen'}};
            Common.UI = {warning: function (options) { warnings.push(options.msg); }};
            try {
                var host = Common.LocalSession.createDesktopHost();
                assert.isFunction(gateway.handlers.opendocumentsource, 'listens before the document is opened');
                assert.equal(host.messages.convert, 'Konvertierung fehlgeschlagen');
                assert.equal(host.messages.converterLoad, 'The document converter could not be loaded.');
                assert.isFalse(host.start({documentType: 'word'}));
                assert.deepEqual(gateway.reported, [{code: ERRORS.Load, text: 'Nicht unterstuetzt'}]);
                assert.deepEqual(warnings, ['Nicht unterstuetzt']);
                host._report(ERRORS.Convert, host.messages.convert);
                assert.deepEqual(warnings, ['Nicht unterstuetzt'], 'only the unsupported build is a warning');
            } finally {
                Common.Gateway = saved.Gateway;
                Common.Controllers = saved.Controllers;
                Common.UI = saved.UI;
            }
        });

        it('unregisters the transport on stop', function () {
            var gateway = fakeGateway(), sdk = fakeSdk();
            var host = createHost(gateway, stubConverter());
            assert.isNull(host.getBlob('blob:any'));
            host.start({documentType: 'cell'});
            host.stop();

            assert.isNull(sdk.transport);
            assert.isFalse(host.isActive());
        });
    });
    describe('Common.LocalSession.Session editing', function () {
        // Opens a session the way sdkjs does and collects what it sends afterwards
        function openSession(extra, source) {
            var t = createSession(stubConverter(), Object.assign({editing: true, now: function () { return 1000; }}, extra || {}));
            var transport = t.session.getTransport();
            t.session.setSource(Object.assign({buffer: bytes('docx').buffer, name: 'a.docx', fileType: 'docx'}, source || {}));
            return runAuthExchange(transport).then(function (received) {
                var messages = [];
                t.session.handlers.onMessage = function (m) { messages.push(m); };
                return {t: t, transport: transport, received: received, messages: messages};
            });
        }

        function types(messages) {
            return messages.map(function (m) { return m.type; });
        }

        it('grants word locks keyed by block id to the own user and releases them with the last chunk', function () {
            return openSession().then(function (s) {
                s.transport.send({type: 'getLock', block: ['p1', 'p2']});
                assert.deepEqual(s.messages[0], {type: 'getLock', locks: {
                    p1: {time: 1000, user: 'uid-10', block: 'p1'},
                    p2: {time: 1000, user: 'uid-10', block: 'p2'}
                }});

                s.transport.send({type: 'saveChanges', changes: JSON.stringify(['c1', 'c2']), startSaveChanges: true, endSaveChanges: false, deleteIndex: null, releaseLocks: true});
                s.transport.send({type: 'saveChanges', changes: JSON.stringify(['c3']), startSaveChanges: false, endSaveChanges: true, deleteIndex: null, releaseLocks: true});
                var part = s.messages[1], end = s.messages[2];
                assert.deepEqual(part, {type: 'savePartChanges', changesIndex: 0, syncChangesIndex: 2});
                assert.equal(end.type, 'unSaveLock');
                assert.equal(end.index, -1, 'not the first chunk');
                assert.equal(end.syncChangesIndex, 3);
                assert.isAbove(end.time, 1000);
                assert.deepEqual(s.t.session.locks, {});

                var records = s.t.session.getChanges();
                assert.deepEqual(records.map(function (r) { return r.change; }), ['"c1"', '"c2"', '"c3"']);
                assert.equal(records[0].user, 'uid-10');
                assert.equal(records[0].useridoriginal, 'uid-1');

                s.transport.send({type: 'saveChanges', changes: JSON.stringify(['c4']), startSaveChanges: true, endSaveChanges: true, deleteIndex: null});
                assert.equal(s.messages[3].index, 3, 'first chunk of a save: index of its first change');
                assert.equal(s.messages[3].syncChangesIndex, 4);
                assert.isAbove(s.messages[3].time, end.time);
            });
        });

        it('keys cell, slide and pdf locks by block guid', function () {
            return openSession({documentType: 'cell'}).then(function (s) {
                var block = {sheetId: '1', type: 1, rangeOrObjectId: [0, 0, 0, 0], guid: 'g1'};
                s.transport.send({type: 'getLock', block: [block]});
                assert.deepEqual(s.messages[0].locks, {g1: {time: 1000, user: 'uid-10', block: block}});
            });
        });

        it('drops changes from deleteIndex on', function () {
            return openSession().then(function (s) {
                s.transport.send({type: 'saveChanges', changes: JSON.stringify(['a', 'b', 'c']), startSaveChanges: true, endSaveChanges: true, deleteIndex: null});
                s.transport.send({type: 'saveChanges', changes: JSON.stringify(['d']), startSaveChanges: true, endSaveChanges: true, deleteIndex: 1});
                assert.equal(s.messages[1].index, -1);
                assert.equal(s.messages[1].syncChangesIndex, 2);
                assert.deepEqual(s.t.session.getChanges().map(function (r) { return r.change; }), ['"a"', '"d"']);
            });
        });

        it('answers unLockDocument with releaseLock and unSaveLock, and unSaveLock with -1', function () {
            return openSession().then(function (s) {
                s.transport.send({type: 'getLock', block: ['p1']});
                s.transport.send({type: 'unLockDocument', isSave: true, unlock: false, deleteIndex: null, releaseLocks: true});
                assert.deepEqual(types(s.messages), ['getLock', 'releaseLock', 'unSaveLock']);
                assert.deepEqual(s.messages[1].locks, [{block: 'p1', user: 'uid-10', time: 1000, changes: null}]);
                assert.deepEqual(s.messages[2], {type: 'unSaveLock', index: -1, time: -1, syncChangesIndex: -1});

                s.transport.send({type: 'unLockDocument', isSave: false, releaseLocks: true});
                assert.equal(s.messages.length, 3, 'no locks left, nothing to release');

                s.transport.send({type: 'unSaveLock'});
                assert.deepEqual(s.messages[3], {type: 'unSaveLock', index: -1, time: -1, syncChangesIndex: -1});
            });
        });

        it('opens a bin source without conversion and replays its changes', function () {
            var converter = stubConverter();
            var t = createSession(converter, {editing: true, indexUser: 2});
            t.session.setSource({
                buffer: bytes('DOCY;bin').buffer, name: 'a.docx', fileType: 'docx', format: 'bin',
                media: {'image1.png': bytes('png')},
                changes: [
                    {docid: 'd', change: '"r1"', time: 5, user: 'bob0', useridoriginal: 'bob'},
                    'c2',
                    '["c3","c4"]'
                ]
            });
            return runAuthExchange(t.session.getTransport()).then(function (received) {
                assert.equal(converter.calls.length, 0);
                var authChanges = received[2], auth = received[3], open = received[4];
                assert.equal(authChanges.type, 'authChanges');
                assert.deepEqual(authChanges.changes.map(function (r) { return r.change; }), ['"r1"', '"c2"', '"c3"', '"c4"']);
                assert.equal(authChanges.changes[0].user, 'bob0');
                assert.equal(authChanges.changes[1].user, 'uid-12', 'plain change strings belong to this user');
                assert.deepEqual(auth.changes, authChanges.changes);
                assert.equal(auth.indexUser, 2);
                assert.equal(auth.participants[0].id, 'uid-12');
                assert.isFalse(auth.participants[0].view);
                assert.equal(open.data.data['Editor.bin'], 'blob:test/1');
                assert.equal(open.data.data['media/image1.png'], 'blob:test/0');
                assert.equal(t.session.getUserId(), 'uid-12');
            });
        });

        it('relays co-editing messages with the host transport', function () {
            var toHost = [];
            var t = createSession(stubConverter(), {transport: 'host', editing: true, indexUser: 1,
                participants: [{id: 'bob0', idOriginal: 'bob', username: 'Bob', indexUser: 0, view: false}],
                onHostMessage: function (m) { toHost.push(m); }});
            var transport = t.session.getTransport();
            t.session.setSource({buffer: bytes('docx').buffer, name: 'a.docx'});
            t.session.receiveHostMessage({type: 'connectState', participantsTimestamp: 1, participants: [], waitAuth: false});

            return runAuthExchange(transport).then(function (received) {
                var auth = received[3];
                assert.deepEqual(auth.participants.map(function (p) { return p.id; }), ['bob0', 'uid-11']);
                assert.deepEqual(toHost, [{type: 'sessionAuth', user: 'uid-1', indexUser: 1, connectionId: 'uid-11', sessionId: t.session.sessionId}]);
                return new Promise(function (resolve) { setTimeout(resolve, 0); }).then(function () { return received; });
            }).then(function (received) {
                assert.equal(received[received.length - 1].type, 'connectState', 'held back until the document was opened');

                var messages = [];
                t.session.handlers.onMessage = function (m) { messages.push(m); };
                toHost.length = 0;
                ['getLock', 'releaseLock', 'isSaveLock', 'saveChanges', 'unSaveLock', 'unLockDocument', 'cursor', 'message', 'authChangesAck'].forEach(function (type) {
                    transport.send({type: type});
                });
                assert.deepEqual(types(toHost), ['getLock', 'releaseLock', 'isSaveLock', 'saveChanges', 'unSaveLock', 'unLockDocument', 'cursor', 'message', 'authChangesAck']);
                assert.equal(messages.length, 0, 'nothing is answered locally');

                transport.send({type: 'rpc', responseKey: 3, data: {c: 'imgurls', data: ['image1.png']}});
                transport.send({type: 'rpc', responseKey: 4, data: {type: 'pathurls', data: ['media/image1.png']}});
                transport.send({type: 'rpc', responseKey: 5, data: {type: 'wopi_RefreshFile'}});
                assert.deepEqual(messages.map(function (m) { return m.responseKey; }), [3, 4, 5]);
                assert.deepEqual(messages[1].data, {status: 'ok', data: [t.session.urls['media/image1.png']]});
                assert.isUndefined(messages[2].data, 'calls that need a server are answered at once');
                assert.equal(toHost.length, 9, 'rpc stays local');
                messages.length = 0;

                var fromHost = {type: 'saveChanges', changes: [{change: '"x"', user: 'bob0'}], changesIndex: 1, endSaveChanges: true, locks: []};
                t.session.receiveHostMessage(fromHost);
                assert.equal(messages[0], fromHost, 'delivered unchanged');

                transport.send({type: 'close'});
                assert.equal(toHost[toHost.length - 1].type, 'close');
                assert.isTrue(t.session.isClosed());
            });
        });

        it('exports a user save to the save format and reports it like a forcesave', function () {
            var requested = [], saved = [];
            return openSession({
                saveFormat: 'docx',
                onSaveRequest: function (format) { requested.push(format); return true; },
                onSave: function (blob, fileType) { saved.push({blob: blob, fileType: fileType}); }
            }).then(function (s) {
                assert.isTrue(s.t.session.startUserSave());
                assert.deepEqual(requested, ['docx']);
                var start = s.messages[0];
                assert.equal(start.type, 'forceSaveStart');
                assert.equal(start.messages.code, 0);

                return new Promise(function (resolve) {
                    s.transport.convert({data: 'DOCY;bin', fileType: 0x0041, format: 'docx', options: {nobase64: true}}, resolve);
                }).then(function (result) {
                    assert.equal(result.status, 'ok');
                    assert.equal(saved.length, 1);
                    assert.equal(saved[0].fileType, 'docx');
                    assert.equal(saved[0].blob, s.t.session.getBlob(result.data));
                    assert.deepEqual(s.messages[1], {type: 'forceSave', messages: {type: 1, time: start.messages.time, success: true}});

                    // a later download is no save
                    return new Promise(function (resolve) {
                        s.transport.convert({data: 'DOCY;bin', fileType: 0x0041, format: 'docx'}, resolve);
                    });
                }).then(function () {
                    assert.equal(saved.length, 1);
                    // sdkjs' own forceSaveStart starts a save as well
                    s.transport.send({type: 'forceSaveStart'});
                    assert.deepEqual(requested, ['docx', 'docx']);
                });
            });
        });

        it('reports a save that cannot start or fails', function () {
            var t;
            return openSession({saveFormat: 'odt', onSaveRequest: function () { return false; }}).then(function (s) {
                assert.isFalse(s.t.session.startUserSave());
                assert.deepEqual(types(s.messages), ['forceSaveStart', 'forceSave']);
                assert.isFalse(s.messages[1].messages.success);
                return openSession({onSaveRequest: function () { return true; }});
            }).then(function (s) {
                s.t.session.startUserSave();
                assert.equal(s.messages[0].messages.code, 3, 'no save format');
                var failing = createSession(stubConverter({fail: {code: 'convert', message: 'x'}}), {saveFormat: 'docx', onSaveRequest: function () { return true; }});
                var messages = [];
                failing.session.handlers = {onMessage: function (m) { messages.push(m); }};
                failing.session.startUserSave();
                return new Promise(function (resolve) {
                    failing.session.getTransport().convert({data: 'x', format: 'docx'}, resolve);
                }).then(function (result) {
                    assert.equal(result.status, 'err');
                    assert.deepEqual(types(messages), ['forceSaveStart', 'forceSave']);
                    assert.isFalse(messages[1].messages.success);
                });
            });
        });

        it('stores inserted images as session media and exports them', function () {
            var registered = [], media = [];
            var converter = stubConverter();
            var t = createSession(converter, {
                registerImageUrl: function (name, url) { registered.push([name, url]); },
                onMedia: function (name, blob) { media.push({name: name, blob: blob}); }
            });
            t.session.setSource({buffer: bytes('docx').buffer, name: 'a.docx'});
            var transport = t.session.getTransport();
            return runAuthExchange(transport).then(function () {
                return new Promise(function (resolve) {
                    transport.uploadImages([new File([bytes('img')], 'photo.JPG', {type: 'image/jpeg'})], function (error, urls) { resolve({error: error, urls: urls}); });
                });
            }).then(function (res) {
                assert.equal(res.error, 0);
                var name = registered[0][0];
                assert.match(name, /^image_\w+_1\.jpg$/);
                assert.deepEqual(Object.keys(res.urls), ['media/' + name], 'the DocService upload reply shape');
                var url = res.urls['media/' + name];
                assert.equal(registered[0][1], url);
                assert.equal(media[0].name, name, 'bare name for the host');
                assert.equal(media[0].blob.type, 'image/jpeg');
                assert.equal(t.session._imageUrl(name), url);
                return new Promise(function (resolve) {
                    transport.convert({data: 'DOCY', format: 'docx'}, resolve);
                }).then(function () {
                    var request = converter.calls[converter.calls.length - 1];
                    assert.deepEqual(Array.from(request.media[name]), Array.from(bytes('img')));
                    assert.isTrue(Object.prototype.hasOwnProperty.call(request.media, 'image1.png'));
                });
            }).then(function () {
                return new Promise(function (resolve) { transport.uploadImages([], function (error) { resolve(error); }); });
            }).then(function (error) {
                assert.equal(error, -11);
            });
        });

        it('adds media from elsewhere under their bare names', function () {
            var registered = [];
            var t = createSession(stubConverter(), {registerImageUrl: function (name, url) { registered.push(name); }});
            return t.session.addMedia({'media/image7.png': new Blob(['png']), 'image8.svg': bytes('<svg/>')}).then(function () {
                assert.sameMembers(registered, ['image7.png', 'image8.svg']);
                assert.equal(t.session._imageUrl('image7.png'), t.session.urls['media/image7.png']);
                var svg = t.created.filter(function (c) { return c.url === t.session.urls['image8.svg']; })[0];
                assert.equal(svg.blob.type, 'image/svg+xml');
                assert.isOk(t.session.mediaBytes['image8.svg']);
            });
        });

        it('picks a format the converter can write', function () {
            var saveFormat = Common.LocalSession.saveFormat;
            assert.equal(saveFormat('docx', 'word'), 'docx');
            assert.equal(saveFormat('odt', 'word'), 'odt');
            assert.equal(saveFormat('doc', 'word'), 'docx');
            assert.equal(saveFormat('epub', 'word'), 'docx');
            assert.equal(saveFormat('xls', 'cell'), 'xlsx');
            assert.equal(saveFormat('csv', 'cell'), 'xlsx');
            assert.equal(saveFormat('ppt', 'slide'), 'pptx');
            assert.equal(saveFormat('odp', 'slide'), 'odp');
            assert.isNull(saveFormat('pdf', 'pdf'));
        });

        it('restricts permissions by mode', function () {
            var restrict = Common.LocalSession.restrictPermissions;
            assert.deepEqual(restrict({edit: true, review: true}, {mode: 'edit'}), {edit: true, review: true, chat: false});
            var viewer = restrict({edit: true, comment: true}, {mode: 'view'});
            assert.isFalse(viewer.edit);
            assert.isFalse(viewer.comment);
            assert.equal(Common.LocalSession.sessionTransport({session: {type: 'local', transport: 'host'}}), 'host');
            assert.equal(Common.LocalSession.sessionTransport({session: {type: 'local'}}), 'self');
        });

        it('sets the editor flags of a local session', function () {
            var canCoAuthoring = Common.LocalSession.canCoAuthoring;
            assert.isTrue(canCoAuthoring({}));
            assert.isTrue(canCoAuthoring({session: {type: 'local', transport: 'host'}}));
            assert.isFalse(canCoAuthoring({session: {type: 'local', transport: 'self'}}));

            var server = {isEdit: true, canForcesave: true, forcesave: true, canUseMailMerge: true};
            Common.LocalSession.applyAppOptions(server);
            assert.deepEqual(server, {isEdit: true, canForcesave: true, forcesave: true, canUseMailMerge: true});

            var local = {isLocalSession: true, isEdit: true, canForcesave: true, forcesave: false, canUseMailMerge: true};
            Common.LocalSession.applyAppOptions(local);
            assert.deepEqual(local, {isLocalSession: true, isEdit: true, canForcesave: false, forcesave: true, canUseMailMerge: false});

            var viewer = {isLocalSession: true, isEdit: false, canForcesave: false, forcesave: false};
            Common.LocalSession.applyAppOptions(viewer);
            assert.deepEqual(viewer, {isLocalSession: true, isEdit: false, canForcesave: false, forcesave: false});
        });

        it('opens a document with restricted permissions and downloads session exports as blobs', function () {
            var savedAscCommon = window.AscCommon;
            var registered;
            window.AscCommon = {setLocalSessionTransport: function (t) { registered = t; }};
            var downloads = [];
            var gateway = {
                on: function () {},
                reportError: function () {},
                downloadAs: function (url, fileType) { downloads.push(['url', url, fileType]); },
                downloadAsBlob: function (blob, fileType) { downloads.push(['blob', blob, fileType]); }
            };
            try {
                var host = new Common.LocalSession.Host({gateway: gateway});
                var permissions = {edit: true, comment: true};
                var doc = {fileType: 'odt', permissions: {}};
                assert.isTrue(host.openDocument({api: {}, documentType: 'word', user: {id: 'u', fullname: 'U'}, doc: doc, permissions: permissions,
                    editorConfig: {mode: 'edit', session: {type: 'local', transport: 'host', x2tUrl: 'x/', indexUser: 2}}}));
                assert.strictEqual(doc.permissions, permissions);
                assert.isFalse(permissions.chat);
                assert.isTrue(permissions.edit);
                assert.strictEqual(registered, host.session.getTransport());
                assert.equal(host.session.transportType, 'host');
                assert.equal(host.session.indexUser, 2);
                assert.equal(host.session.x2tUrl, 'x/');
                assert.equal(host.session.saveFormat, 'odt');
                assert.equal(host.session.getUserId(), 'u2');

                var blob = new Blob(['x']);
                var url = host.session._registerBlob(blob, 'odt');
                host.downloadAs(url, 'odt');
                host.downloadAs('https://example.com/file.odt', 'odt');
                assert.deepEqual(downloads, [['blob', blob, 'odt'], ['url', 'https://example.com/file.odt', 'odt']]);
                host.stop();
            } finally {
                window.AscCommon = savedAscCommon;
            }
        });
    });
});
