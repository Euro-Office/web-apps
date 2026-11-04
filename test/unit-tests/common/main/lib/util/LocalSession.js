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
    'common/main/lib/util/LocalSession'
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

        it('answers isSaveLock and ignores co-editing messages', function () {
            var t = createSession(stubConverter());
            var transport = t.session.getTransport();
            var messages = [];
            transport.connect({onOpen: function () {}, onMessage: function (m) { messages.push(m); }, onClose: function () {}, onDisconnect: function () {}});

            return new Promise(function (resolve) { setTimeout(resolve, 5); }).then(function () {
                messages.length = 0;
                transport.send({type: 'isSaveLock'});
                transport.send({type: 'saveChanges', changes: []});
                transport.send({type: 'getLock', block: []});
                transport.send({type: 'cursor', cursor: ''});
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
});
