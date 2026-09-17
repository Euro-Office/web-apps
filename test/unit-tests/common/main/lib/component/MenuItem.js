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
 *  MenuItem.js
 *
 *  Unit test
 *
 *  Covers the icon markup: a sprite name draws an <svg><use> out of the
 *  shipped icons.svg, anything else stays the <span> the colour pickers
 *  paint as a swatch.
 *
 */

define([
    'backbone',
    'common/main/lib/component/MenuItem'
],function() {
    var chai    = require('chai'),
        should  = chai.should();

    var tagOf = function (el) {
        return el.length ? el[0].nodeName.toLowerCase() : '';
    };

    var renderItem = function (placeholder, options) {
        var item = new Common.UI.MenuItem(options);
        $(placeholder).append(item.render().$el);
        return item;
    };

    describe('Common.UI.menuItemIconMarkup', function(){
        it('draws a sprite name as an svg pointing into the symbol sheet', function(){
            var markup = $(Common.UI.menuItemIconMarkup('btn-copy'));

            assert.equal(tagOf(markup), 'svg', 'sprite icon is an svg');
            assert.equal(markup.find('use').attr('href'), '#btn-copy', 'href names the symbol');
            assert.isTrue(markup.hasClass('menu-item-icon'), 'keeps the menu-item-icon class');
            assert.isTrue(markup.hasClass('uni-scale'), 'uni-scale marks the svg valid at any ratio');
            assert.isTrue(markup.hasClass('btn-copy'), 'keeps the caller class');
        });

        it('picks the sprite name out of a multi-class string', function(){
            var markup = $(Common.UI.menuItemIconMarkup('some-cls btn-paste icon-rtl'));

            assert.equal(markup.find('use').attr('href'), '#btn-paste');
        });

        it('leaves a class that is not a sprite name as a span', function(){
            var markup = $(Common.UI.menuItemIconMarkup('menu-item-icon-color'));

            assert.equal(tagOf(markup), 'span', 'swatch stays a span');
            assert.equal(markup.find('use').length, 0, 'no symbol reference');
            assert.isTrue(markup.hasClass('menu-item-icon-color'), 'keeps the caller class');
        });

        it('survives an empty iconCls', function(){
            var markup = $(Common.UI.menuItemIconMarkup(''));

            assert.equal(tagOf(markup), 'span');
        });
    });

    describe('Common.UI.MenuItem icons', function(){
        var item,
            domPlaceholder = document.createElement('div');

        beforeEach(function(){
            $('body').append(domPlaceholder);
        });

        afterEach(function(){
            item && item.remove();
            item = null;
            $(domPlaceholder).empty();
        });

        it('renders a sprite icon as an svg', function(){
            item = renderItem(domPlaceholder, {caption: 'Copy', iconCls: 'btn-copy'});

            var icon = item.cmpEl.find('.menu-item-icon');
            assert.equal(icon.length, 1, 'exactly one icon element');
            assert.equal(tagOf(icon), 'svg');
            assert.equal(icon.find('use').attr('href'), '#btn-copy');
        });

        it('renders a swatch class as a span', function(){
            item = renderItem(domPlaceholder, {caption: 'Automatic', iconCls: 'menu-item-icon-color'});

            var icon = item.cmpEl.find('.menu-item-icon');
            assert.equal(icon.length, 1);
            assert.equal(tagOf(icon), 'span');
        });

        it('setIconCls repoints the symbol between two sprite names', function(){
            item = renderItem(domPlaceholder, {caption: 'Copy', iconCls: 'btn-copy'});
            item.setIconCls('btn-paste');

            var icon = item.cmpEl.find('.menu-item-icon');
            assert.equal(icon.length, 1);
            assert.equal(tagOf(icon), 'svg');
            assert.equal(icon.find('use').attr('href'), '#btn-paste', 'symbol follows the new class');
            assert.isFalse(icon.hasClass('btn-copy'), 'old class dropped');
            assert.isTrue(icon.hasClass('btn-paste'), 'new class added');
            assert.equal(item.iconCls, 'btn-paste');
        });

        it('setIconCls swaps the svg for a span when the icon becomes a swatch', function(){
            item = renderItem(domPlaceholder, {caption: 'Colour', iconCls: 'btn-copy'});
            item.setIconCls('menu-item-icon-color');

            var icon = item.cmpEl.find('.menu-item-icon');
            assert.equal(icon.length, 1, 'no leftover svg beside the swatch');
            assert.equal(tagOf(icon), 'span', 'swatch is a span, not an empty svg');
            assert.equal(icon.find('use').length, 0, 'no dangling symbol reference');
            assert.isTrue(icon.hasClass('menu-item-icon-color'));
            assert.isFalse(icon.hasClass('btn-copy'), 'old sprite class is gone');
        });

        it('setIconCls swaps the span for an svg when a swatch becomes an icon', function(){
            item = renderItem(domPlaceholder, {caption: 'Colour', iconCls: 'menu-item-icon-color'});
            item.setIconCls('btn-copy');

            var icon = item.cmpEl.find('.menu-item-icon');
            assert.equal(icon.length, 1);
            assert.equal(tagOf(icon), 'svg', 'sprite is an svg, not a blank span');
            assert.equal(icon.find('use').attr('href'), '#btn-copy');
            assert.isFalse(icon.hasClass('menu-item-icon-color'), 'old swatch class is gone');
        });

        it('applyScaling leaves a swatch alone above ratio 2', function(){
            item = renderItem(domPlaceholder, {caption: 'Colour', iconCls: 'menu-item-icon-color'});
            item.applyScaling(3);

            var icon = item.cmpEl.find('.menu-item-icon');
            assert.equal(icon.length, 1, 'no svg injected next to the swatch');
            assert.equal(tagOf(icon), 'span');
            assert.equal(item.cmpEl.find('use').length, 0, 'no href="#null" left behind');
        });

        it('applyScaling keeps the single template svg above ratio 2', function(){
            item = renderItem(domPlaceholder, {caption: 'Copy', iconCls: 'btn-copy'});
            item.applyScaling(3);

            var icon = item.cmpEl.find('.menu-item-icon');
            assert.equal(icon.length, 1, 'template svg is not duplicated');
            assert.equal(icon.find('use').attr('href'), '#btn-copy');
        });
    });
});
