/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

define([
    'common/main/lib/component/TabBar',
    'common/main/lib/util/utils'
], function () {
    describe('Common.UI.TabBar smooth scrolling', function () {
        var fixture, tabbar, bar, gateway, matchMedia, animationFrame, cancelFrame;

        beforeEach(function () {
            gateway = Common.Gateway;
            Common.Gateway = _.extend({}, Backbone.Events);
            matchMedia = window.matchMedia;
            animationFrame = window.requestAnimationFrame;
            cancelFrame = window.cancelAnimationFrame;
        });

        afterEach(function () {
            window.matchMedia = matchMedia;
            Common.Gateway = gateway;
            if (tabbar) {
                tabbar.cancelTabScroll();
            }
            window.requestAnimationFrame = animationFrame;
            window.cancelAnimationFrame = cancelFrame;
            $(fixture).remove();
            fixture = tabbar = null;
        });

        function render(direction) {
            var widths = [64, 91, 53, 117, 72, 101, 83];
            fixture = $('<div class="tabbar-test">').attr('dir', direction).css({
                position: 'relative',
                width: 192
            }).appendTo(document.body);
            var tabbarEl = $('<div>').appendTo(fixture);
            $('<style>').text('.tabbar-test .separator-item { width: 1px; margin-inline-start: 20px; }')
                .appendTo(fixture);

            tabbar = new Common.UI.TabBar({el: tabbarEl, placement: 'bottom', smoothScroll: true});
            // The application EventBus forwards this to the view's listeners.
            tabbar.fireEvent = tabbar.trigger;
            tabbar.render();
            tabbar.empty(true);
            tabbar.setDirection(direction === 'rtl');
            tabbar.$bar.css({
                display: 'flex',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                margin: 0,
                padding: 0,
                lineHeight: '20px'
            });
            tabbar.add(widths.map(function (width, index) {
                return {label: 'Sheet ' + (index + 1), sheetindex: index, active: index === 0};
            }));
            tabbar.$bar.children().each(function (index) {
                $(this).css({flex: 'none', width: widths[index]});
            });
            bar = tabbar.$bar[0];
        }

        function wheel(options) {
            var event = new WheelEvent('wheel', Object.assign({bubbles: true, cancelable: true}, options));
            bar.dispatchEvent(event);
            return event;
        }

        function preferReducedMotion(matches) {
            window.matchMedia = function (query) {
                return query === '(prefers-reduced-motion: reduce)'
                    ? {matches: matches}
                    : matchMedia.call(window, query);
            };
        }

        function controlFrames() {
            var callbacks = new Map(), nextId = 0;
            window.requestAnimationFrame = function (callback) {
                callbacks.set(++nextId, callback);
                return nextId;
            };
            window.cancelAnimationFrame = function (id) { callbacks.delete(id); };
            return function (timestamp) {
                var pending = Array.from(callbacks.values());
                callbacks.clear();
                pending.forEach(function (callback) { callback(timestamp); });
            };
        }

        ['ltr', 'rtl'].forEach(function (direction) {
            var rtl = direction === 'rtl',
                sign = rtl ? -1 : 1,
                towardEnd = rtl ? 'backward' : 'forward',
                towardStart = rtl ? 'forward' : 'backward',
                startEdge = rtl ? 'right' : 'left';

            describe(direction.toUpperCase(), function () {
                beforeEach(function () { render(direction); });

                it('uses the dominant physical wheel axis and preserves small deltas', function () {
                    assert.isTrue(wheel({deltaX: sign * 3, deltaY: -sign}).defaultPrevented);
                    assert.equal(bar.scrollLeft, sign * 3);
                    wheel({deltaX: -sign * 2, deltaY: sign * 11});
                    assert.equal(bar.scrollLeft, sign * 14);
                    wheel({deltaX: -sign});
                    assert.equal(bar.scrollLeft, sign * 13);

                    for (var i = 0; i < 4; i++) {
                        wheel({deltaX: sign * 0.25});
                    }
                    assert.equal(bar.scrollLeft, sign * 14);
                });

                it('converts line and page wheel deltas and clamps at both ends', function () {
                    wheel({deltaY: sign * 2, deltaMode: WheelEvent.DOM_DELTA_LINE});
                    assert.equal(bar.scrollLeft, sign * 40);
                    wheel({deltaY: sign, deltaMode: WheelEvent.DOM_DELTA_PAGE});
                    assert.equal(bar.scrollLeft, sign * (40 + bar.clientWidth));
                    wheel({deltaX: sign * 1000});
                    assert.equal(bar.scrollLeft, sign * (bar.scrollWidth - bar.clientWidth));
                    wheel({deltaX: -sign * 1000});
                    assert.equal(bar.scrollLeft, 0);
                });

                it('snaps arrow paging to tab starts and exposes the last tab at the end', async function () {
                    preferReducedMotion(true);
                    var startState = {first: rtl, last: !rtl},
                        endState = {first: !rtl, last: rtl},
                        visibilityChanged = new Promise(function (resolve) {
                            tabbar.once('tab:invisible', function (source, state) { resolve(state); });
                        });

                    function assertAligned(index) {
                        var tab = tabbar.getAt(index).$el[0];
                        assert.closeTo(tab.getBoundingClientRect()[startEdge],
                            bar.getBoundingClientRect()[startEdge], 1, 'sheet ' + (index + 1) + ' is aligned');
                    }

                    assert.deepEqual(tabbar.checkInvisible(true), startState);
                    tabbar.setTabVisible(towardEnd);
                    assertAligned(2);
                    assert.deepEqual(tabbar.checkInvisible(true), {first: true, last: true});
                    tabbar.setTabVisible(towardEnd);
                    assertAligned(4);
                    tabbar.setTabVisible(towardStart);
                    assertAligned(2);
                    tabbar.setTabVisible(towardStart);
                    assertAligned(0);
                    assert.deepEqual(tabbar.checkInvisible(true), startState);

                    tabbar.setTabVisible(towardEnd);
                    tabbar.setTabVisible(towardEnd);
                    tabbar.setTabVisible(towardEnd);
                    assert.isTrue(tabbar.isTabVisible(tabbar.getCount() - 1));
                    assert.deepEqual(await visibilityChanged, endState);
                    assert.equal(tabbar.getActive(), 0, 'arrow paging preserves the active sheet');
                });

                it('reveals the active sheet while an arrow animation is in progress', function () {
                    preferReducedMotion(false);
                    var advance = controlFrames();
                    tabbar.setTabVisible(towardEnd);
                    assert.equal(bar.scrollLeft, 0, 'the arrow starts an animation');
                    advance(0);
                    advance(16);
                    assert.isAbove(Math.abs(bar.scrollLeft), 0, 'arrow scrolling is underway');
                    assert.isBelow(Math.abs(bar.scrollLeft), 155, 'the arrow has yet to reach the next tab start');

                    var activeIndex = 4;
                    assert.isFalse(tabbar.isTabVisible(activeIndex));
                    tabbar.setActive(activeIndex);
                    tabbar.setTabVisible(activeIndex);
                    assert.equal(tabbar.getActive(), activeIndex);
                    assert.isTrue(tabbar.isTabVisible(activeIndex));

                    var revealedAt = bar.scrollLeft;
                    advance(32);
                    advance(48);
                    assert.equal(bar.scrollLeft, revealedAt, 'the arrow animation no longer moves the strip');
                });

                it('keeps the first animation frame from moving against the requested direction', function () {
                    preferReducedMotion(false);
                    var advance = controlFrames();
                    bar.scrollLeft = sign * 64;
                    var start = bar.scrollLeft, timestamp = performance.now();
                    tabbar.setTabVisible(towardEnd);

                    advance(timestamp - 5);
                    assert.equal(bar.scrollLeft, start, 'an earlier frame timestamp leaves the position intact');
                    advance(timestamp + 16);
                    assert.isAbove((bar.scrollLeft - start) * sign, 0, 'later frames move toward the requested end');
                });

                it('stops an old animation when the tabs are rebuilt', function () {
                    preferReducedMotion(false);
                    var advance = controlFrames();
                    tabbar.setTabVisible(towardEnd);
                    var timestamp = performance.now();
                    advance(timestamp + 16);
                    assert.isAbove(Math.abs(bar.scrollLeft), 0);

                    var items = tabbar.tabs.map(function (tab, index) {
                        return {label: 'Updated sheet ' + index, sheetindex: index, active: index === 0};
                    });
                    // Statusbar.update rebuilds the children while retaining the scroll container.
                    tabbar.empty(true);
                    tabbar.add(items);
                    tabbar.$bar.children().css({flex: 'none', width: 100});
                    bar.scrollLeft = 0;

                    advance(timestamp + 32);
                    advance(timestamp + 48);
                    assert.equal(bar.scrollLeft, 0, 'the rebuild position survives subsequent frames');
                    assert.isTrue(tabbar.isTabVisible(0));
                });

                it('limits each arrow step to the viewport width even with an oversized tab', function () {
                    preferReducedMotion(true);
                    tabbar.getAt(0).$el.width(250);
                    tabbar.setTabVisible(towardEnd);
                    assert.isAbove(Math.abs(bar.scrollLeft), 0);
                    assert.isAtMost(Math.abs(bar.scrollLeft), bar.clientWidth);

                    bar.scrollLeft = sign * 250;
                    var start = bar.scrollLeft;
                    tabbar.setTabVisible(towardStart);
                    assert.isAbove((start - bar.scrollLeft) * sign, 0);
                    assert.isAtMost(Math.abs(bar.scrollLeft - start), bar.clientWidth);
                });

                it('reveals the last and first sheets when selected from the opposite end', function () {
                    var last = tabbar.getCount() - 1;
                    assert.isFalse(tabbar.isTabVisible(last));
                    tabbar.setActive(last);
                    tabbar.setTabVisible(last);
                    assert.isTrue(tabbar.isTabVisible(last));

                    assert.isFalse(tabbar.isTabVisible(0));
                    tabbar.setActive(0);
                    tabbar.setTabVisible(0);
                    assert.isTrue(tabbar.isTabVisible(0));
                });
            });
        });

        it('leaves modified wheel events and wheel events on a fitting strip available to the editor', function () {
            render('ltr');
            assert.isFalse(wheel({deltaY: 30, ctrlKey: true}).defaultPrevented);
            assert.isFalse(wheel({deltaY: 30, metaKey: true}).defaultPrevented);
            assert.equal(bar.scrollLeft, 0);

            fixture.width(700);
            assert.equal(bar.scrollWidth, bar.clientWidth);
            assert.isFalse(wheel({deltaY: 30}).defaultPrevented);
        });
    });
});
