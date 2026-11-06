/*!
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH or a Nextcloud affiliate company and Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 *  Switcher.js
 *
 *  Unit test
 *
 *  Covers the on/off value, click toggling and the thumb snap. Dragging
 *  the thumb depends on real pointer coordinates and is left out.
 *
 */

define([
    'backbone',
    'common/main/lib/util/utils',
    'common/main/lib/component/Switcher'
],function() {
    describe('Common.UI.Switcher', function(){
        var switcher,
            domPlaceholder = document.createElement('div');

        // initialize() calls setValue, which touches the rendered element, so
        // the switcher has to be given its el up front.
        var createSwitcher = function (options) {
            switcher = new Common.UI.Switcher(_.extend({el: $(domPlaceholder)}, options));
            return switcher;
        };

        beforeEach(function(){
            $('body').append(domPlaceholder);
        });

        afterEach(function(){
            switcher && switcher.off();
            switcher = null;
            $(domPlaceholder).empty();
        });

        it('renders a switcher with a thumb at the configured size', function(){
            createSwitcher({width: 40, thumbWidth: 14});

            assert.equal(switcher.cmpEl.hasClass('switcher'), true);
            assert.equal(switcher.thumb.length, 1);
            assert.equal(switcher.cmpEl.width(), 40);
            assert.equal(switcher.thumb.width(), 14);
            assert.isTrue(switcher.rendered);
        });

        it('starts off by default', function(){
            createSwitcher();

            assert.isFalse(switcher.getValue());
            assert.isFalse(switcher.cmpEl.hasClass('on'));
        });

        it('starts on when value is true', function(){
            createSwitcher({value: true});

            assert.isTrue(switcher.getValue());
            assert.isTrue(switcher.cmpEl.hasClass('on'));
        });

        it('setValue only accepts a strict true as on', function(){
            createSwitcher();

            switcher.setValue(true);
            assert.isTrue(switcher.getValue());
            assert.isTrue(switcher.cmpEl.hasClass('on'));

            switcher.setValue('true');
            assert.isFalse(switcher.getValue());
            assert.isFalse(switcher.cmpEl.hasClass('on'));
        });

        it('setValue does not fire change', function(){
            createSwitcher();
            var fired = 0;
            switcher.on('change', function () { fired++; });

            switcher.setValue(true);

            assert.equal(fired, 0);
        });

        it('toggles on click and fires change with the new value', function(){
            createSwitcher();
            var calls = [];
            switcher.on('change', function (cmp, value) { calls.push([cmp, value]); });

            switcher.cmpEl.trigger('click');
            assert.isTrue(switcher.getValue());
            assert.isTrue(switcher.cmpEl.hasClass('on'));

            switcher.cmpEl.trigger('click');
            assert.isFalse(switcher.getValue());

            assert.equal(calls.length, 2);
            assert.strictEqual(calls[0][0], switcher);
            assert.isTrue(calls[0][1]);
            assert.isFalse(calls[1][1]);
        });

        it('ignores clicks while disabled', function(){
            createSwitcher({disabled: true});
            var fired = 0;
            switcher.on('change', function () { fired++; });

            assert.isTrue(switcher.isDisabled());
            assert.isTrue(switcher.cmpEl.hasClass('disabled'));

            switcher.cmpEl.trigger('click');

            assert.isFalse(switcher.getValue());
            assert.equal(fired, 0);
        });

        it('responds to clicks again once re-enabled', function(){
            createSwitcher({disabled: true});
            switcher.setDisabled(false);

            assert.isFalse(switcher.isDisabled());
            assert.isFalse(switcher.cmpEl.hasClass('disabled'));

            switcher.cmpEl.trigger('click');
            assert.isTrue(switcher.getValue());
        });
    });
});
