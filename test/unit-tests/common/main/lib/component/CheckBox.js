/*!
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH or a Nextcloud affiliate company and Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 *  CheckBox.js
 *
 *  Unit test
 *
 *  Covers the checked / unchecked / indeterminate value cycle and the
 *  change event the settings panels listen to.
 *
 */

define([
    'backbone',
    'common/main/lib/component/CheckBox'
],function() {
    describe('Common.UI.CheckBox', function(){
        var chb,
            domPlaceholder = document.createElement('div');

        var createCheckBox = function (options) {
            chb = new Common.UI.CheckBox(options || {});
            chb.render($(domPlaceholder));
            return chb;
        };

        var pressSpace = function (cmp) {
            cmp.$label.trigger($.Event('keydown', {keyCode: Common.UI.Keys.SPACE}));
        };

        beforeEach(function(){
            $('body').append(domPlaceholder);
        });

        afterEach(function(){
            chb && chb.off();
            chb = null;
            $(domPlaceholder).empty();
        });

        it('renders a native checkbox tied to its shape label', function(){
            createCheckBox();

            var input = chb.$el.find('input[type=checkbox]');
            assert.equal(input.length, 1);
            assert.equal(chb.$el.find('label.checkbox__shape').attr('for'), input.attr('id'));
            assert.isTrue(chb.rendered);
            assert.equal(chb.getValue(), 'unchecked');
            assert.isFalse(chb.isChecked());
        });

        it('shows labelText in the description span and hides an empty one', function(){
            createCheckBox({labelText: 'Bold'});
            assert.equal(chb.$span.text(), 'Bold');
            assert.equal(chb.$span.css('visibility'), 'visible');

            chb.setCaption('');
            assert.equal(chb.$span.text(), '');
            assert.equal(chb.$span.css('visibility'), 'hidden');
        });

        it('treats true, "true", 1, "1" and "checked" as checked', function(){
            createCheckBox();
            [true, 'true', 1, '1', 'checked'].forEach(function (value) {
                chb.setValue('unchecked');
                chb.setValue(value);
                assert.equal(chb.getValue(), 'checked', 'value ' + JSON.stringify(value));
                assert.isTrue(chb.isChecked());
                assert.isTrue(chb.$chk.prop('checked'), 'native input follows');
                assert.equal(chb.$el.find('label.checkbox__shape').attr('aria-checked'), 'true');
            });
        });

        it('treats anything else as unchecked', function(){
            createCheckBox({value: true});
            chb.setValue('nope');
            assert.equal(chb.getValue(), 'unchecked');
            assert.isFalse(chb.$chk.prop('checked'));
            assert.equal(chb.$el.find('label.checkbox__shape').attr('aria-checked'), 'false');
        });

        it('supports the indeterminate state', function(){
            createCheckBox();
            chb.setValue('indeterminate');

            assert.equal(chb.getValue(), 'indeterminate');
            assert.isFalse(chb.isChecked());
            assert.isTrue(chb.$chk.prop('indeterminate'));
            assert.equal(chb.$el.find('label.checkbox__shape').attr('aria-checked'), 'mixed');
        });

        it('fires change with the new and previous value', function(){
            createCheckBox();
            var calls = [];
            chb.on('change', function (cmp, value, lastValue) { calls.push([cmp, value, lastValue]); });

            chb.setValue(true);

            assert.equal(calls.length, 1);
            assert.strictEqual(calls[0][0], chb);
            assert.equal(calls[0][1], 'checked');
            assert.equal(calls[0][2], 'unchecked');
        });

        it('does not fire change when suspendchange is set', function(){
            createCheckBox();
            var fired = 0;
            chb.on('change', function () { fired++; });

            chb.setValue(true, true);

            assert.equal(fired, 0);
            assert.equal(chb.getValue(), 'checked', 'value still applied');
        });

        it('applies the value option on render without firing change', function(){
            chb = new Common.UI.CheckBox({value: 'indeterminate'});
            var fired = 0;
            chb.on('change', function () { fired++; });
            chb.render($(domPlaceholder));

            assert.equal(fired, 0);
            assert.equal(chb.getValue(), 'indeterminate');
        });

        it('keeps a value set before render and applies it on render', function(){
            chb = new Common.UI.CheckBox({});
            chb.setValue(true);
            chb.render($(domPlaceholder));

            assert.equal(chb.getValue(), 'checked');
        });

        it('toggles on click and fires change', function(){
            createCheckBox();
            var values = [];
            chb.on('change', function (cmp, value) { values.push(value); });

            chb.$chk.trigger('click');
            assert.equal(chb.getValue(), 'checked');
            chb.$chk.trigger('click');
            assert.equal(chb.getValue(), 'unchecked');
            assert.deepEqual(values, ['checked', 'unchecked']);
        });

        it('clears the indeterminate state to unchecked on click', function(){
            createCheckBox({value: 'indeterminate'});

            chb.$chk.trigger('click');

            assert.equal(chb.getValue(), 'unchecked');
            assert.isFalse(chb.$chk.prop('indeterminate'));
            assert.isFalse(chb.$chk.prop('checked'));
        });

        it('toggles on Space', function(){
            createCheckBox();

            pressSpace(chb);
            assert.equal(chb.getValue(), 'checked');
            pressSpace(chb);
            assert.equal(chb.getValue(), 'unchecked');
        });

        it('ignores clicks and Space while disabled', function(){
            createCheckBox({disabled: true});
            var fired = 0;
            chb.on('change', function () { fired++; });

            assert.isTrue(chb.isDisabled());
            assert.isTrue(chb.$label.hasClass('disabled'));
            assert.isTrue(chb.$chk.prop('disabled'));

            chb.$chk.trigger('click');
            pressSpace(chb);

            assert.equal(chb.getValue(), 'unchecked');
            assert.equal(fired, 0);
        });

        it('re-enables and drops the disabled markers', function(){
            createCheckBox({disabled: true});
            chb.setDisabled(false);

            assert.isFalse(chb.isDisabled());
            assert.isFalse(chb.$label.hasClass('disabled'));
            assert.isFalse(chb.$chk.prop('disabled'));

            chb.$chk.trigger('click');
            assert.equal(chb.getValue(), 'checked');
        });

        it('parks the tab index at -1 while disabled and restores it', function(){
            createCheckBox();
            chb.setTabIndex(3);
            assert.equal(chb.$label.attr('tabindex'), '3');

            chb.setDisabled(true);
            assert.equal(chb.$label.attr('tabindex'), '-1');

            chb.setDisabled(false);
            assert.equal(chb.$label.attr('tabindex'), '3');
        });
    });
});
