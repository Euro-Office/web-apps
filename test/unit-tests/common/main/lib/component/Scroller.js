/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

define([
    'backbone',
    'common/main/lib/component/Scroller'
],function() {
    var chai    = require('chai'),
        should  = chai.should();

    describe('Common.UI.Scroller', function(){
        var host;

        var makeBox = function(contentHeight, contentWidth) {
            var $el = $('<div style="position:fixed;left:10px;top:10px;width:100px;height:100px;"><div style="height:' + contentHeight + 'px;width:' + (contentWidth || 50) + 'px;"></div></div>');
            $(host).append($el);
            return $el;
        };

        var mouse = function(el, type, x, y) {
            var r = el.getBoundingClientRect();
            el.dispatchEvent(new MouseEvent(type, {bubbles: true, clientX: r.left + x, clientY: r.top + y}));
        };

        beforeEach(function() {
            host = document.createElement('div');
            document.body.appendChild(host);
        });

        afterEach(function() {
            host.remove();
        });

        it('Uses native overflow per suppressScroll option', function(){
            var $el = makeBox(300);
            var scroller = new Common.UI.Scroller({el: $el, suppressScrollX: true});
            $el.css('overflow-x').should.equal('hidden');
            $el.css('overflow-y').should.equal('auto');
            $el.hasClass('eo-scroller').should.equal(true);

            scroller.update({suppressScrollX: false, suppressScrollY: true});
            $el.css('overflow-x').should.equal('auto');
            $el.css('overflow-y').should.equal('hidden');
        });

        it('Adds no perfect-scrollbar nodes', function(){
            var $el = makeBox(300);
            new Common.UI.Scroller({el: $el, alwaysVisibleY: true, scrollYStyle: {top: '2px'}});
            $el.find('[class*="ps-"]').should.have.length(0);
            $el.children().should.have.length(1);
        });

        it('Scrolls natively and reports overflow', function(){
            var $el = makeBox(300);
            var scroller = new Common.UI.Scroller({el: $el, suppressScrollX: true});
            scroller.isVisible().should.equal(true);
            scroller.scrollTop(50);
            scroller.getScrollTop().should.equal(50);
            $el[0].scrollTop.should.equal(50);

            var short = new Common.UI.Scroller({el: makeBox(20)});
            short.isVisible().should.equal(false);
        });

        it('Calls onChange on update and on scroll', function(done){
            var $el = makeBox(300), calls = 0;
            var scroller = new Common.UI.Scroller({el: $el, onChange: function() { calls++; }});
            calls.should.equal(1);
            scroller.update();
            calls.should.equal(2);
            scroller.scrollTop(40);
            setTimeout(function() {
                calls.should.equal(3);
                done();
            }, 50);
        });

        it('Measures the native scrollbar width once', function(){
            var w = Common.UI.Scroller.scrollbarWidth();
            w.should.be.a('number');
            w.should.be.at.least(0);
            Common.UI.Scroller.scrollbarWidth().should.equal(w);
        });

        it('Unbinds on destroy', function(){
            var $el = makeBox(300), calls = 0;
            var scroller = new Common.UI.Scroller({el: $el, onChange: function() { calls++; }});
            scroller.destroy();
            $el.hasClass('eo-scroller').should.equal(false);
            $el.trigger('scroll');
            calls.should.equal(1);
        });

        it('Keeps wheel events from an ancestor that cancels them while it can scroll', function(){
            var $el = makeBox(300), el = $el[0], cancelled = 0;
            new Common.UI.Scroller({el: $el, suppressScrollX: true});
            // like sdkjs' #viewport handler
            host.addEventListener('wheel', function(e) { e.preventDefault(); cancelled++; });
            var wheel = function(deltaY, opts) {
                el.firstChild.dispatchEvent(new WheelEvent('wheel', _.extend({bubbles: true, cancelable: true, deltaY: deltaY}, opts)));
            };

            wheel(50);
            cancelled.should.equal(0);
            wheel(-50);
            cancelled.should.equal(1);  // already at the top

            el.scrollTop = el.scrollHeight;
            wheel(50);
            cancelled.should.equal(2);  // already at the bottom
            wheel(-50);
            cancelled.should.equal(2);
            wheel(-50, {ctrlKey: true});
            cancelled.should.equal(3);  // zoom gestures still reach the editor
        });

        it('Captures the mouse only while a scrollbar drag is held', function(done){
            var $el = makeBox(300), el = $el[0];
            new Common.UI.Scroller({el: $el});

            // content clicks land on a child
            mouse(el.firstChild, 'mousedown', 10, 10);
            Common.UI.Scroller.isMouseCapture().should.equal(false);

            mouse(el, 'mousedown', el.clientWidth + 1, 10);
            Common.UI.Scroller.isMouseCapture().should.equal(true);

            mouse(document.body, 'mouseup', 0, 0);
            setTimeout(function() {
                Common.UI.Scroller.isMouseCapture().should.equal(false);

                // overlay scrollbars sit inside the client box, the press still targets the element
                mouse(el, 'mousedown', el.clientWidth - 2, 10);
                Common.UI.Scroller.isMouseCapture().should.equal(true);
                mouse(document.body, 'mouseup', 0, 0);
                setTimeout(function() {
                    Common.UI.Scroller.isMouseCapture().should.equal(false);
                    done();
                }, 30);
            }, 30);
        });
    });
});
