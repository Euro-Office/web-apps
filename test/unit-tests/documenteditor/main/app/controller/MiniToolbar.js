/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

define([], function () {
    describe('DE.Controllers.MiniToolbar show and hide rules', function () {
        var ctrl, saved = {};

        before(function (done) {
            // Only the rules are under test: stub the editor bootstrap and the view.
            define('de-minitoolbar-stub', [], function () {});
            require.config({map: {'documenteditor/main/app/controller/MiniToolbar': {
                'core': 'de-minitoolbar-stub',
                'documenteditor/main/app/view/MiniToolbar': 'de-minitoolbar-stub'
            }}});
            window.DE = window.DE || {};
            DE.Controllers = DE.Controllers || {};
            Backbone.Controller = Backbone.Controller || {extend: Backbone.Model.extend};
            require(['documenteditor/main/app/controller/MiniToolbar'], function () { done(); }, done);
        });

        beforeEach(function () {
            saved.Keys = Common.UI.Keys;
            Common.UI.Keys = Common.UI.Keys || {ESC: 27};
            ctrl = Object.create(DE.Controllers.MiniToolbar.prototype);
            ctrl._state = {};
            ctrl._visible = false;
        });

        afterEach(function () {
            Common.UI.Keys = saved.Keys;
        });

        var ctx = function (changes) {
            return _.extend({
                enabled: true, isEdit: true, isRestrictedEdit: false, modal: false, toolbarDisabled: false,
                markerMode: false, paintFormat: false, hasSelection: true, inObject: false
            }, changes);
        };

        describe('canShow', function () {
            it('shows for selected text in an editable document', function () {
                expect(ctrl.canShow(ctx())).to.equal(true);
            });
            it('does not show when switched off in the settings', function () {
                expect(ctrl.canShow(ctx({enabled: false}))).to.equal(false);
            });
            it('does not show in view, comment-only or form-filling mode', function () {
                expect(ctrl.canShow(ctx({isEdit: false}))).to.equal(false);
                expect(ctrl.canShow(ctx({isRestrictedEdit: true}))).to.equal(false);
            });
            it('does not show when the Home tab font controls are locked', function () {
                expect(ctrl.canShow(ctx({toolbarDisabled: true}))).to.equal(false);
            });
            it('does not show without a selection', function () {
                expect(ctrl.canShow(ctx({hasSelection: false}))).to.equal(false);
            });
            it('does not show for pictures, shapes, text boxes or equations', function () {
                expect(ctrl.canShow(ctx({inObject: true}))).to.equal(false);
            });
            it('does not show while a dialog is open, the highlighter pen or the format painter is on', function () {
                expect(ctrl.canShow(ctx({modal: true}))).to.equal(false);
                expect(ctrl.canShow(ctx({markerMode: true}))).to.equal(false);
                expect(ctrl.canShow(ctx({paintFormat: true}))).to.equal(false);
            });
            it('does not show without a context', function () {
                expect(ctrl.canShow()).to.equal(false);
            });
        });

        describe('keys', function () {
            it('typing, arrows and Delete hide the bar', function () {
                expect(ctrl.isHidingKey({keyCode: 65, key: 'a'})).to.equal(true);
                expect(ctrl.isHidingKey({keyCode: 37, key: 'ArrowLeft'})).to.equal(true);
                expect(ctrl.isHidingKey({keyCode: 46, key: 'Delete'})).to.equal(true);
                expect(ctrl.isHidingKey({keyCode: 27, key: 'Escape'})).to.equal(true);
            });
            it('Shift, Ctrl, Alt or Meta alone do not', function () {
                expect(ctrl.isHidingKey({keyCode: 16, key: 'Shift'})).to.equal(false);
                expect(ctrl.isHidingKey({keyCode: 17, key: 'Control'})).to.equal(false);
                expect(ctrl.isHidingKey({keyCode: 18, key: 'Alt'})).to.equal(false);
                expect(ctrl.isHidingKey({keyCode: 91, key: 'Meta'})).to.equal(false);
            });
        });

        describe('distance and transparency', function () {
            var rect = {left: 100, top: 100, width: 200, height: 60};
            it('measures the distance from the mouse to the bar', function () {
                expect(ctrl.distanceToRect(150, 120, rect)).to.equal(0);
                expect(ctrl.distanceToRect(90, 120, rect)).to.equal(10);
                expect(ctrl.distanceToRect(150, 200, rect)).to.equal(40);
                expect(ctrl.distanceToRect(97, 96, rect)).to.equal(5);
            });
            it('is opaque over the bar, half transparent near it, hidden far away', function () {
                expect(ctrl.getOpacity(0)).to.equal(1);
                expect(ctrl.getOpacity(1)).to.be.within(0.7, 0.75);
                expect(ctrl.getOpacity(ctrl.hideDistance)).to.equal(0.25);
                expect(ctrl.getOpacity(ctrl.hideDistance + 1)).to.equal(null);
                expect(ctrl.getOpacity(20)).to.be.above(ctrl.getOpacity(100));
            });
        });

        describe('calcPosition', function () {
            var size = {width: 240, height: 60}, area = {width: 1000, height: 700};
            var oneLine = [[300, 300], [300, 320], [500, 300], [500, 320]];
            var threeLines = [[300, 300], [300, 320], [500, 340], [500, 360]];
            var overlaps = function (pos, top, bottom) {
                return pos.top < bottom && pos.top + size.height > top;
            };

            it('puts the bar above a one-line selection, centred on the mouse', function () {
                var pos = ctrl.calcPosition({bounds: oneLine, mouse: {x: 500, y: 310}, size: size, area: area});
                expect(pos).to.deep.equal({left: 380, top: 300 - ctrl.gap - 60});
                expect(overlaps(pos, 300, 320)).to.equal(false);
            });
            it('puts the bar below a one-line selection at the top of the area', function () {
                var top = [[300, 20], [300, 40], [500, 20], [500, 40]];
                var pos = ctrl.calcPosition({bounds: top, mouse: {x: 500, y: 30}, size: size, area: area});
                expect(pos.top).to.equal(40 + ctrl.gap);
            });
            it('puts the bar below a selection made downwards', function () {
                var pos = ctrl.calcPosition({bounds: threeLines, mouse: {x: 500, y: 350}, size: size, area: area});
                expect(pos.top).to.equal(360 + ctrl.gap);
                expect(overlaps(pos, 300, 360)).to.equal(false);
            });
            it('puts the bar above a selection made upwards', function () {
                var pos = ctrl.calcPosition({bounds: threeLines, mouse: {x: 300, y: 310}, size: size, area: area});
                expect(pos.top).to.equal(300 - ctrl.gap - 60);
                expect(overlaps(pos, 300, 360)).to.equal(false);
            });
            it('stays inside the area at the left and right edge', function () {
                expect(ctrl.calcPosition({bounds: oneLine, mouse: {x: 10, y: 310}, size: size, area: area}).left).to.equal(0);
                expect(ctrl.calcPosition({bounds: oneLine, mouse: {x: 990, y: 310}, size: size, area: area}).left).to.equal(760);
            });
            it('goes next to the mouse for a selection taller than the area', function () {
                var tall = [[300, -500], [300, -480], [500, 1200], [500, 1220]];
                var pos = ctrl.calcPosition({bounds: tall, mouse: {x: 500, y: 400}, size: size, area: area});
                expect(pos.top).to.equal(400 - 2 * ctrl.gap - 60);
                expect(ctrl.distanceToRect(500, 400, {left: pos.left, top: pos.top, width: 240, height: 60})).to.be.below(ctrl.hideDistance);
            });
            it('works without the mouse position', function () {
                var pos = ctrl.calcPosition({bounds: oneLine, mouse: null, size: size, area: area});
                expect(pos).to.deep.equal({left: 380, top: 300 - ctrl.gap - 60});
            });
        });

        describe('mouse and keyboard', function () {
            var hidden, shown, clock, $doc, $bar, inner;

            beforeEach(function () {
                hidden = 0;
                shown = [];
                $doc = $('<div id="id_main_view"><canvas></canvas></div>').appendTo('body');
                $bar = $('<div id="mini-toolbar"><input></div>').appendTo('body');
                inner = $bar.find('input')[0];
                ctrl.view = {rendered: true, el: $bar[0], controls: [], isBusy: function () { return false; }};
                ctrl.hide = function () { hidden++; this._visible = false; };
                ctrl.tryShow = function (mouse) { shown.push(mouse); };
                clock = {timers: []};
                saved.setTimeout = window.setTimeout;
                window.setTimeout = function (fn) { clock.timers.push(fn); return clock.timers.length; };
            });

            afterEach(function () {
                window.setTimeout = saved.setTimeout;
                $doc.remove();
                $bar.remove();
            });

            var run = function () { clock.timers.splice(0).forEach(function (fn) { fn(); }); };

            it('shows after a left-button selection in the document', function () {
                var target = $doc.find('canvas')[0];
                ctrl.onDocMouseDown({button: 0, target: target});
                ctrl.onDocMouseUp({button: 0, pageX: 40, pageY: 50, target: target});
                run();
                expect(shown).to.deep.equal([{pageX: 40, pageY: 50}]);
            });
            it('does not show after a right click or a click outside the document', function () {
                var target = $doc.find('canvas')[0];
                ctrl.onDocMouseDown({button: 2, target: target});
                ctrl.onDocMouseUp({button: 2, pageX: 40, pageY: 50, target: target});
                ctrl.onDocMouseDown({button: 0, target: document.body});
                ctrl.onDocMouseUp({button: 0, pageX: 40, pageY: 50, target: document.body});
                run();
                expect(shown.length).to.equal(0);
            });
            it('a click elsewhere hides the bar, a click in the bar does not', function () {
                ctrl._visible = true;
                ctrl.onDocMouseDown({button: 0, target: inner});
                expect(hidden).to.equal(0);
                ctrl.onDocMouseDown({button: 0, target: document.body});
                expect(hidden).to.equal(1);
            });
            it('typing in the document hides the bar, typing a font name in the bar does not', function () {
                ctrl._visible = true;
                ctrl.onDocKeyDown({keyCode: 65, key: 'a', target: inner});
                expect(hidden).to.equal(0);
                ctrl.onDocKeyDown({keyCode: 16, key: 'Shift', target: document.body});
                expect(hidden).to.equal(0);
                ctrl.onDocKeyDown({keyCode: 65, key: 'a', target: document.body});
                expect(hidden).to.equal(1);
            });
            it('Escape in the bar hides it when no list is open', function () {
                ctrl._visible = true;
                var open = true;
                ctrl.view.controls = [{isMenuOpen: function () { return open; }}];
                ctrl.onDocKeyDown({keyCode: 27, key: 'Escape', target: inner});
                expect(hidden).to.equal(0);
                open = false;
                ctrl.onDocKeyDown({keyCode: 27, key: 'Escape', target: inner});
                expect(hidden).to.equal(1);
            });
            it('scrolling hides the bar', function () {
                ctrl._visible = true;
                ctrl.onDocWheel({target: $doc.find('canvas')[0]});
                expect(hidden).to.equal(1);
            });
            it('moving the mouse far away hides the bar, near it makes it more opaque', function () {
                var opacity;
                ctrl._visible = true;
                ctrl._rect = {left: 100, top: 100, width: 200, height: 60};
                ctrl.view.$el = {css: function (k, v) { opacity = v; }, toggleClass: function () {}};
                ctrl.setOpacity = DE.Controllers.MiniToolbar.prototype.setOpacity;
                ctrl.onDocMouseMove({pageX: 150, pageY: 120, buttons: 0});
                expect(opacity).to.equal(1);
                ctrl.onDocMouseMove({pageX: 150, pageY: 180, buttons: 0});
                expect(opacity).to.be.below(1);
                expect(hidden).to.equal(0);
                ctrl.onDocMouseMove({pageX: 150, pageY: 600, buttons: 0});
                expect(hidden).to.equal(1);
            });
            it('stays while one of its lists is open', function () {
                var opacity;
                ctrl._visible = true;
                ctrl._rect = {left: 100, top: 100, width: 200, height: 60};
                ctrl.view.isBusy = function () { return true; };
                ctrl.view.$el = {css: function (k, v) { opacity = v; }, toggleClass: function () {}};
                ctrl.setOpacity = DE.Controllers.MiniToolbar.prototype.setOpacity;
                ctrl.onDocMouseMove({pageX: 150, pageY: 900, buttons: 0});
                expect(hidden).to.equal(0);
                expect(opacity).to.equal(1);
            });
            it('another menu opening hides the bar, one of its own lists does not', function (done) {
                window.setTimeout = saved.setTimeout;   // _.defer needs the real timer
                var open = true;
                ctrl._visible = true;
                ctrl.view.controls = [{isMenuOpen: function () { return open; }}];
                ctrl.onOtherMenuShow();
                _.defer(function () {
                    expect(hidden).to.equal(0);
                    open = false;
                    ctrl.onOtherMenuShow();
                    _.defer(function () {
                        expect(hidden).to.equal(1);
                        done();
                    });
                });
            });
        });
    });
});
