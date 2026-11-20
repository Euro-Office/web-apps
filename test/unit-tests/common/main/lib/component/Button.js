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
 *  Button.js
 *
 *  Unit test
 *
 *  Created by Alexander Yuzhin on 6/20/14
 *  Copyright (c) 2018 Ascensio System SIA. All rights reserved.
 *
 */

define([
    'backbone',
    'common/main/lib/component/Button',
    'common/main/lib/component/Menu'
],function() {
    var chai    = require('chai'),
        should  = chai.should();

    describe('Common.UI.Button', function(){
        var button,
            domPlaceholder = document.createElement('div');

        it('Create simple button', function(){
            $('body').append(domPlaceholder);

            button = new Common.UI.Button({
                id: 'id-btn-simple',
                caption: 'test'
            });

            button.render($(domPlaceholder));

            should.exist(button);
            $('#id-btn-simple').should.have.length(1);
        });

        it('Button caption', function(){
            button.caption.should.equal('test');
        });

        it('Button update caption', function(){
            button.setCaption('update caption');

            // object
            button.caption.should.equal('update caption');

            // dom
            assert.equal(button.cmpEl.find('button:first').addBack().filter('button').text(), 'update caption', 'dom caption');
        });

        it('Button toggle', function(){
            button.toggle();
            assert.equal(button.isActive(), true, 'should by active');
            button.toggle();
            assert.equal(button.isActive(), false, 'should NOT by active');

            button.toggle(false);
            assert.equal(button.isActive(), false, 'should NOT by active');
            button.toggle(true);
            assert.equal(button.isActive(), true, 'should by active');

            button.toggle(false);
        });

        it('Button disable', function(){
            assert.equal(button.isDisabled(), false, 'should NOT by disable');

            button.setDisabled(true);
            assert.equal(button.isDisabled(), true, 'should by disable');

            button.setDisabled(false);
            assert.equal(button.isDisabled(), false, 'should NOT by disable');
        });

        it('Remove simple button', function(){
            button.remove();
            $('#id-btn-simple').should.have.length(0);

            button = null;
//            domPlaceholder.remove();
        });

        it('Create split button', function(){
            $('body').append(domPlaceholder);

            button = new Common.UI.Button({
                id      : 'id-btn-split',
                caption : 'split',
                split   : true,
                menu        : new Common.UI.Menu({
                    items: [
                        {
                            caption: 'print',
                            value: 'print'
                        }
                    ]
                })
            });

            button.render($(domPlaceholder));

            should.exist(button);
            $('#id-btn-split').should.have.length(1);
            $('#id-btn-split button').should.have.length(2);
        });

        it('Remove split button', function(){
            button.remove();
            $('#id-btn-split').should.have.length(0);

            button = null;
//            domPlaceholder.remove();
        });
    });

    describe('Common.UI.Button hint on a disabled button', function(){
        var button,
            domPlaceholder = document.createElement('div');

        // the real tooltip is created on the first mouseenter; a stand-in is enough to see what setDisabled does
        var fakeTip = function () {
            return {enabled: true, hidden: 0, hide: function () { this.hidden++; }, updateTitle: function () {}};
        };

        beforeEach(function(){
            $('body').append(domPlaceholder);
        });

        afterEach(function(){
            button && button.remove();
            button = null;
            $(domPlaceholder).empty();
        });

        it('a disabled button without a hint still gets the disabled attribute', function(){
            button = new Common.UI.Button({caption: 'plain', disabled: true});
            button.render($(domPlaceholder));

            assert.isTrue(button.isDisabled());
            assert.isTrue(button.cmpEl.hasClass('disabled'));
            assert.equal(button.cmpEl.attr('disabled'), 'disabled');
        });

        it('a disabled button with a hint keeps mouse events and its hint', function(){
            button = new Common.UI.Button({caption: 'hinted', hint: 'What this button does'});
            button.render($(domPlaceholder));
            var tip = fakeTip();
            button.btnEl.data('bs.tooltip', tip);

            button.setDisabled(true);
            assert.isTrue(button.cmpEl.hasClass('disabled'), 'greyed out');
            assert.isUndefined(button.cmpEl.attr('disabled'), 'no disabled attribute, so hover still works');
            assert.isTrue(tip.enabled, 'hint stays switched on');
            assert.equal(tip.hidden, 1, 'an open hint is closed once');

            button.setDisabled(false);
            assert.isFalse(button.cmpEl.hasClass('disabled'));
            assert.isTrue(tip.enabled);
        });

        it('a click on a disabled button with a hint does nothing', function(){
            var clicks = 0;
            button = new Common.UI.Button({caption: 'hinted', hint: 'What this button does', disabled: true});
            button.render($(domPlaceholder));
            button.on('click', function () { clicks++; });

            button.cmpEl.trigger($.Event('click', {which: 1}));
            assert.equal(clicks, 0);

            button.setDisabled(false);
            button.cmpEl.trigger($.Event('click', {which: 1}));
            assert.equal(clicks, 1);
        });

        it('a hint added to a button that is already disabled lets it get mouse events', function(){
            button = new Common.UI.Button({caption: 'late', disabled: true});
            button.render($(domPlaceholder));
            assert.equal(button.cmpEl.attr('disabled'), 'disabled');

            button.updateHint('Added later');
            assert.isUndefined(button.cmpEl.attr('disabled'));
            assert.isTrue(button.cmpEl.hasClass('disabled'));
        });

        it('a disabled split button with hints: both parts greyed out, no disabled attribute, no click', function(){
            var clicks = 0;
            button = new Common.UI.Button({
                caption : 'split',
                split   : true,
                hint    : ['Main part', 'Menu part'],
                menu    : new Common.UI.Menu({items: [{caption: 'one', value: 1}]})
            });
            button.render($(domPlaceholder));
            button.on('click', function () { clicks++; });

            button.setDisabled(true);
            var parts = button.cmpEl.children('button');
            assert.equal(parts.length, 2);
            parts.each(function () {
                assert.isTrue($(this).hasClass('disabled'));
                assert.isUndefined($(this).attr('disabled'));
            });

            parts.first().trigger($.Event('mousedown', {which: 1}));
            assert.isFalse(parts.first().hasClass('active'), 'no pressed look on mousedown');
            parts.first().trigger($.Event('click', {which: 1}));
            assert.equal(clicks, 0);
        });

        it('a disabled button with a hint is aria-disabled and out of the tab order', function(){
            button = new Common.UI.Button({caption: 'hinted', hint: 'What this button does', disabled: true});
            button.render($(domPlaceholder));

            assert.equal(button.cmpEl.attr('aria-disabled'), 'true');
            assert.equal(button.cmpEl.attr('tabindex'), '-1');

            button.setDisabled(false);
            assert.isUndefined(button.cmpEl.attr('aria-disabled'));
            assert.isUndefined(button.cmpEl.attr('tabindex'), 'focusable again as a normal button');
        });

        it('enabling a button with a hint brings back its own tabindex', function(){
            button = new Common.UI.Button({caption: 'hinted', hint: 'What this button does'});
            button.render($(domPlaceholder));
            button.cmpEl.attr('tabindex', '2');

            button.setDisabled(true);
            assert.equal(button.cmpEl.attr('tabindex'), '-1');
            button.setDisabled(false);
            assert.equal(button.cmpEl.attr('tabindex'), '2');

            button.setTabIndex(5);
            button.setDisabled(true);
            assert.equal(button.cmpEl.attr('tabindex'), '-1');
            button.setDisabled(false);
            assert.equal(button.cmpEl.attr('tabindex'), '5');
        });

        it('a disabled split button with hints: both parts aria-disabled, the group itself untouched', function(){
            button = new Common.UI.Button({
                caption : 'split',
                split   : true,
                hint    : ['Main part', 'Menu part'],
                menu    : new Common.UI.Menu({items: [{caption: 'one', value: 1}]})
            });
            button.render($(domPlaceholder));

            button.setDisabled(true);
            button.cmpEl.children('button').each(function () {
                assert.equal($(this).attr('aria-disabled'), 'true');
                assert.equal($(this).attr('tabindex'), '-1');
            });
            assert.isUndefined(button.cmpEl.attr('aria-disabled'));
            assert.isUndefined(button.cmpEl.attr('tabindex'));

            button.setDisabled(false);
            button.cmpEl.children('button').each(function () {
                assert.isUndefined($(this).attr('aria-disabled'));
                assert.isUndefined($(this).attr('tabindex'));
            });
        });

        it('a hint added to a button that is already disabled makes it aria-disabled', function(){
            button = new Common.UI.Button({caption: 'late', disabled: true});
            button.render($(domPlaceholder));
            assert.isUndefined(button.cmpEl.attr('aria-disabled'), 'the disabled attribute is enough');

            button.updateHint('Added later');
            assert.equal(button.cmpEl.attr('aria-disabled'), 'true');
            assert.equal(button.cmpEl.attr('tabindex'), '-1');
        });

        it('a mousedown on a disabled button with a hint does not take the focus or reach the document', function(){
            var outside = 0,
                onOutside = function () { outside++; };
            button = new Common.UI.Button({caption: 'hinted', hint: 'What this button does', disabled: true});
            button.render($(domPlaceholder));
            $(document).on('mousedown click', onOutside);

            var down = $.Event('mousedown', {which: 1});
            button.cmpEl.trigger(down);
            assert.isTrue(down.isDefaultPrevented(), 'no focus move on mousedown');
            button.cmpEl.trigger($.Event('click', {which: 1}));
            assert.equal(outside, 0, 'the press goes no further, as with the disabled attribute');

            button.setDisabled(false);
            down = $.Event('mousedown', {which: 1});
            button.cmpEl.trigger(down);
            assert.isFalse(down.isDefaultPrevented(), 'an enabled button behaves as before');
            assert.equal(outside, 1);

            $(document).off('mousedown click', onOutside);
        });
    });
});