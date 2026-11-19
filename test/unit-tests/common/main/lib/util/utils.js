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
 *  utils.js
 *
 *  Unit test
 *
 *  Created by Alexander Yuzhin on 5/7/14
 *  Copyright (c) 2018 Ascensio System SIA. All rights reserved.
 *
 */

define([
    'common/main/lib/util/utils'
],function() {
    describe('Common.Utils.String', function(){
        it('Test format', function(){
            assert.equal('successively: first, second', Common.Utils.String.format('successively: {0}, {1}', 'first', 'second'));
            assert.equal('revers: second, first',       Common.Utils.String.format('revers: {1}, {0}', 'first', 'second'));
        });

        it('Test htmlEncode', function(){
            assert.equal('Curly, Larry &amp; Moe', Common.Utils.String.htmlEncode('Curly, Larry & Moe'));
        });

        it('Test htmlDecode', function(){
            assert.equal('Curly, Larry & Moe', Common.Utils.String.htmlDecode('Curly, Larry &amp; Moe'));
        });

        it('Test ellipsis', function(){
            assert.equal('Truncate a s...', Common.Utils.String.ellipsis('Truncate a string and add an ellipsis', 15));
            assert.equal('Truncate a string and add...', Common.Utils.String.ellipsis('Truncate a string and add an ellipsis', 30, true));
        });
    });
    describe('Common.Utils.isCompactHeader', function(){
        it('defaults to true', function(){
            assert.isTrue(Common.Utils.isCompactHeader(undefined));
            assert.isTrue(Common.Utils.isCompactHeader({}));
            assert.isTrue(Common.Utils.isCompactHeader({compactHeader: true}));
        });

        it('is false only when an integration passes false', function(){
            assert.isFalse(Common.Utils.isCompactHeader({compactHeader: false}));
            assert.isTrue(Common.Utils.isCompactHeader({compactHeader: 0}));
        });
    });

    describe('Common.Utils.centerStylePreview', function(){
        // A white preview at 2x (280x92 = 140x46 css px) with a black box as content
        var preview = function(box) {
            var c = document.createElement('canvas');
            c.width = 280; c.height = 92;
            var ctx = c.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 280, 92);
            ctx.fillStyle = '#000';
            box && ctx.fillRect(box.x, box.y, box.w, box.h);
            return load(c.toDataURL());
        };
        var load = function(url) {
            return new Promise(function(resolve) {
                var img = new Image();
                img.onload = function() { resolve(img); };
                img.src = url;
            });
        };
        // Bounding box of the dark pixels
        var inkBox = function(img) {
            var c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            var ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            var d = ctx.getImageData(0, 0, c.width, c.height).data, r = {x0: c.width, x1: -1, y0: c.height, y1: -1};
            for (var y = 0; y < c.height; y++)
                for (var x = 0; x < c.width; x++)
                    if (d[(y * c.width + x) * 4] < 128) {
                        r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x);
                        r.y0 = Math.min(r.y0, y); r.y1 = Math.max(r.y1, y);
                    }
            return {w: c.width, h: c.height, left: r.x0, right: c.width - 1 - r.x1, top: r.y0, bottom: c.height - 1 - r.y1};
        };

        it('centres content on a tile-sized canvas in device pixels', function(){
            return preview({x: 4, y: 10, w: 60, h: 30}).then(function(img) {
                return load(Common.Utils.centerStylePreview(img, 104, 40).center);
            }).then(function(out) {
                var b = inkBox(out);
                assert.equal(b.w, 208);
                assert.equal(b.h, 80);
                assert.isAtMost(Math.abs(b.left - b.right), 1);
                assert.isAtMost(Math.abs(b.top - b.bottom), 1);
            });
        });

        it('keeps the tile aspect ratio for content wider than the tile', function(){
            return preview({x: 0, y: 20, w: 260, h: 40}).then(function(img) {
                return load(Common.Utils.centerStylePreview(img, 104, 40).center);
            }).then(function(out) {
                var b = inkBox(out);
                assert.isAbove(b.w, 260);
                assert.closeTo(b.w / b.h, 104 / 40, 0.05);
                assert.isAtMost(Math.abs(b.left - b.right), 1);
            });
        });

        it('keeps the list copy left-aligned and centres it vertically', function(){
            return preview({x: 10, y: 4, w: 60, h: 30}).then(function(img) {
                return load(Common.Utils.centerStylePreview(img, 104, 40).left);
            }).then(function(out) {
                var b = inkBox(out);
                assert.equal(b.w, 280);
                assert.equal(b.left, 10);
                assert.isAtMost(Math.abs(b.top - b.bottom), 1);
            });
        });

        it('returns null for a blank preview', function(){
            return preview(null).then(function(img) {
                assert.isNull(Common.Utils.centerStylePreview(img, 104, 40));
            });
        });
    });
});
