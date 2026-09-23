/*
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

// The application normally creates this namespace before loading its modules.
window.PDFE = window.PDFE || {Controllers: {}, Views: {}};
require.config({
    paths: {
        core: 'common/main/lib/core/application',
        gateway: 'common/Gateway'
    }
});

define([
    'pdfeditor/main/app/controller/DocumentHolder',
    'pdfeditor/main/app/controller/Print'
], function () {
    describe('PDFE.Controllers.DocumentHolder wheel events', function () {
        var fixture, holder, controller, zooms, registrations, documentListeners, subscriptions;

        beforeEach(function () {
            fixture = document.createElement('div');
            holder = document.createElement('div');
            holder.id = 'editor_sdk';
            fixture.appendChild(holder);
            document.body.appendChild(fixture);
            zooms = [];
            registrations = [];
            documentListeners = [];
            subscriptions = [];

            // Exercise the real controller methods without starting an SDK session.
            controller = Object.create(PDFE.Controllers.DocumentHolder.prototype);
            controller.api = {
                zoomIn: function () { zooms.push('in'); },
                zoomOut: function () { zooms.push('out'); }
            };
            controller.documentHolder = {el: holder, cmpEl: $(holder)};
            controller.getApplication = function () {
                return {getController: function () {
                    return {getView: function () {
                        return {hlayout: {on: function () {}}};
                    }};
                }};
            };

            // Record registrations so document/window handlers can be removed
            // without disturbing handlers installed by other suites.
            var addHolderListener = holder.addEventListener,
                addDocumentListener = document.addEventListener,
                on = $.fn.on;
            holder.addEventListener = function (type, listener, options) {
                registrations.push(type);
                addHolderListener.call(this, type, listener, options);
            };
            document.addEventListener = function (type, listener, options) {
                documentListeners.push([type, listener, options]);
                addDocumentListener.call(this, type, listener, options);
            };
            $.fn.on = function () {
                subscriptions.push({element: this, args: Array.prototype.slice.call(arguments)});
                return on.apply(this, arguments);
            };
            try {
                controller.onAfterRender();
            } finally {
                holder.addEventListener = addHolderListener;
                document.addEventListener = addDocumentListener;
                $.fn.on = on;
            }
        });

        afterEach(function () {
            clearTimeout(controller._scrollEndTimeout);
            subscriptions.forEach(function (subscription) {
                $.fn.off.apply(subscription.element, subscription.args);
            });
            documentListeners.forEach(function (args) {
                document.removeEventListener.apply(document, args);
            });
            $(fixture).remove();
        });

        it('does not register a standard wheel listener on the SDK-owned surface', function () {
            // Chrome suppresses the SDK's legacy mousewheel listener when a
            // wheel listener is registered on the same element. Synthetic
            // events cannot reproduce that trusted-input behavior, so check
            // the registration contract explicitly here.
            assert.notInclude(registrations, 'wheel');
        });

        it('leaves ordinary wheel input available to the SDK', function () {
            var received = 0;
            holder.addEventListener('mousewheel', function () { received++; });
            var event = new WheelEvent('mousewheel', {
                deltaY: 120, bubbles: true, cancelable: true
            });
            holder.dispatchEvent(event);

            assert.equal(received, 1);
            assert.isFalse(event.defaultPrevented);
            assert.deepEqual(zooms, []);
        });

        it('zooms once in each direction for Ctrl-mousewheel on the PDF', function () {
            [-120, 120].forEach(function (delta) {
                var event = new WheelEvent('mousewheel', {
                    deltaY: delta, ctrlKey: true, bubbles: true, cancelable: true
                });
                holder.dispatchEvent(event);
                assert.isTrue(event.defaultPrevented);
            });
            assert.deepEqual(zooms, ['in', 'out']);
        });

        it('handles the SDK Firefox event using its detail delta', function () {
            [-3, 3].forEach(function (delta) {
                holder.dispatchEvent(new MouseEvent('DOMMouseScroll', {
                    detail: delta, ctrlKey: true, bubbles: true, cancelable: true
                }));
            });
            assert.deepEqual(zooms, ['in', 'out']);
        });

        it('lets print preview consume Ctrl-wheel without zooming the PDF', function () {
            var preview = document.createElement('div'), directions = [];
            fixture.appendChild(preview);
            preview.addEventListener('wheel', function (event) {
                PDFE.Controllers.Print.prototype.onPreviewWheel.call({
                    onChangePreviewPage: function (forward) { directions.push(forward); }
                }, event);
            }, {passive: false});

            [120, -120].forEach(function (delta) {
                preview.dispatchEvent(new WheelEvent('wheel', {
                    deltaY: delta, ctrlKey: true, bubbles: true, cancelable: true
                }));
            });
            assert.deepEqual(directions, [true, false]);
            assert.deepEqual(zooms, []);
        });

        it('still handles Ctrl-wheel that bubbles from outside the PDF', function () {
            fixture.dispatchEvent(new WheelEvent('wheel', {
                deltaY: -120, ctrlKey: true, bubbles: true, cancelable: true
            }));
            assert.deepEqual(zooms, ['in']);
        });
    });
});
