/*!
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH or a Nextcloud affiliate company and Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 *  RadioBox.js
 *
 *  Unit test
 *
 *  Covers the checked state, the change event and group exclusivity
 *  between radioboxes that share a name.
 *
 */

define([
    'backbone',
    'common/main/lib/component/RadioBox'
],function() {
    describe('Common.UI.RadioBox', function(){
        var radios = [],
            domPlaceholder = document.createElement('div');

        // RadioBox renders in its constructor, and group exclusivity looks the
        // siblings up by name in the document, so each one gets an attached host.
        var createRadio = function (options) {
            var host = $('<div></div>').appendTo(domPlaceholder);
            var radio = new Common.UI.RadioBox(_.extend({el: host}, options));
            radios.push(radio);
            return radio;
        };

        var pressSpace = function (cmp) {
            cmp.$label.trigger($.Event('keydown', {keyCode: Common.UI.Keys.SPACE}));
        };

        beforeEach(function(){
            $('body').append(domPlaceholder);
        });

        afterEach(function(){
            radios.forEach(function (radio) { radio.off(); });
            radios = [];
            $(domPlaceholder).empty();
        });

        it('renders a native radio input inside the radiobox', function(){
            var radio = createRadio({name: 'grp'});

            var input = radio.$el.find('input[type=radio]');
            assert.equal(input.length, 1);
            assert.equal(input.attr('name'), 'grp');
            assert.equal(radio.$label.attr('role'), 'radio');
            assert.isFalse(radio.getValue());
        });

        it('generates a group name when none is given', function(){
            var radio = createRadio();

            assert.isString(radio.name);
            assert.isAbove(radio.name.length, 0);
            assert.equal(radio.$radio.attr('name'), radio.name);
        });

        it('shows labelText and uses it as the aria-label', function(){
            var radio = createRadio({labelText: 'Portrait'});

            assert.equal(radio.$span.text(), 'Portrait');
            assert.equal(radio.$span.css('visibility'), 'visible');
            assert.equal(radio.$label.attr('aria-label'), 'Portrait');
        });

        it('prefers ariaLabel over labelText', function(){
            var radio = createRadio({labelText: 'Portrait', ariaLabel: 'Page orientation portrait'});

            assert.equal(radio.$label.attr('aria-label'), 'Page orientation portrait');
        });

        it('hides the caption span when there is no labelText', function(){
            var radio = createRadio();

            assert.equal(radio.$span.css('visibility'), 'hidden');
        });

        it('applies the checked option without firing change', function(){
            var radio = createRadio({checked: true});

            assert.isTrue(radio.getValue());
            assert.isTrue(radio.$radio.hasClass('checked'));
            assert.equal(radio.$label.attr('aria-checked'), 'true');
        });

        it('treats true, "true", 1 and "1" as checked', function(){
            var radio = createRadio();
            [true, 'true', 1, '1'].forEach(function (value) {
                radio.setValue(false, true);
                radio.setValue(value, true);
                assert.isTrue(radio.getValue(), 'value ' + JSON.stringify(value));
            });
        });

        it('fires change with the new state', function(){
            var radio = createRadio();
            var calls = [];
            radio.on('change', function (cmp, value) { calls.push([cmp, value]); });

            radio.setValue(true);
            radio.setValue(false);

            assert.equal(calls.length, 2);
            assert.strictEqual(calls[0][0], radio);
            assert.isTrue(calls[0][1]);
            assert.isFalse(calls[1][1]);
        });

        it('does not fire change when the state does not change', function(){
            var radio = createRadio({checked: true});
            var fired = 0;
            radio.on('change', function () { fired++; });

            radio.setValue(true);

            assert.equal(fired, 0);
        });

        it('does not fire change when suspendchange is set', function(){
            var radio = createRadio();
            var fired = 0;
            radio.on('change', function () { fired++; });

            radio.setValue(true, true);

            assert.equal(fired, 0);
            assert.isTrue(radio.getValue());
        });

        it('checks on click and on Space', function(){
            var first = createRadio({name: 'grp'}),
                second = createRadio({name: 'grp'});

            first.$label.trigger('click');
            assert.isTrue(first.getValue());

            pressSpace(second);
            assert.isTrue(second.getValue());
        });

        it('unchecks the other radioboxes that share its name', function(){
            var first = createRadio({name: 'grp', checked: true}),
                second = createRadio({name: 'grp'}),
                other = createRadio({name: 'other', checked: true});

            second.setValue(true);

            assert.isFalse(first.getValue(), 'sibling unchecked');
            assert.isFalse(first.$radio.hasClass('checked'));
            assert.equal(first.$label.attr('aria-checked'), 'false');
            assert.isTrue(second.getValue());
            assert.isTrue(other.getValue(), 'a different group is left alone');
        });

        it('ignores clicks and Space while disabled', function(){
            var radio = createRadio({disabled: true});
            var fired = 0;
            radio.on('change', function () { fired++; });

            assert.isTrue(radio.isDisabled());
            assert.isTrue(radio.$label.hasClass('disabled'));
            assert.isTrue(radio.$radio.prop('disabled'));

            radio.$label.trigger('click');
            pressSpace(radio);

            assert.isFalse(radio.getValue());
            assert.equal(fired, 0);
        });

        it('parks the tab index at -1 while disabled and restores it', function(){
            var radio = createRadio();
            radio.setTabIndex(2);
            assert.equal(radio.$label.attr('tabindex'), '2');

            radio.setDisabled(true);
            assert.equal(radio.$label.attr('tabindex'), '-1');

            radio.setDisabled(false);
            assert.equal(radio.$label.attr('tabindex'), '2');
            assert.isFalse(radio.$radio.prop('disabled'));
        });
    });
});
