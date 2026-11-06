/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

define([
    'common/Gateway'
],function() {
    describe('Common.UserActivity', function() {
        var clock, sent, handlers, activity;

        var fire = function(type, props) {
            var e = {type: type, isTrusted: true};
            for (var k in props) e[k] = props[k];
            handlers[type](e);
        };

        beforeEach(function() {
            clock = 1000;
            sent = 0;
            handlers = {};
            var target = {
                addEventListener: function(type, handler, options) {
                    assert.isTrue(options.capture);
                    handlers[type] = handler;
                }
            };
            activity = Common.UserActivity(function() { sent++; }, function() { return clock; }, 10000);
            activity.listen(target);
        });

        it('listens for the same inputs as Nextcloud core', function() {
            assert.sameMembers(Object.keys(handlers), ['pointerdown', 'keydown', 'beforeinput', 'wheel', 'mousemove']);
        });

        it('sends on the first input, then at most once per interval', function() {
            fire('keydown');
            assert.equal(sent, 1);
            clock += 9999;
            fire('keydown');
            fire('pointerdown');
            assert.equal(sent, 1);
            clock += 1;
            fire('wheel');
            assert.equal(sent, 2);
        });

        it('sends nothing without input', function() {
            clock += 60000;
            assert.equal(sent, 0);
        });

        it('ignores script-generated events', function() {
            fire('keydown', {isTrusted: false});
            assert.equal(sent, 0);
        });

        it('ignores mousemove when the pointer has not moved', function() {
            fire('mousemove', {screenX: 10, screenY: 20});
            clock += 10000;
            fire('mousemove', {screenX: 10, screenY: 20});
            assert.equal(sent, 1);
            fire('mousemove', {screenX: 11, screenY: 20});
            assert.equal(sent, 2);
        });

        it('lets nested editors report through the same throttle', function() {
            activity.mark();
            fire('keydown');
            assert.equal(sent, 1);
        });

        it('counts input in a second window, such as the presenter view, through the same throttle', function() {
            var popup = {};
            activity.listen({addEventListener: function(type, handler) { popup[type] = handler; }});
            popup.keydown({type: 'keydown', isTrusted: true});
            fire('keydown');
            assert.equal(sent, 1);
        });
    });
});
