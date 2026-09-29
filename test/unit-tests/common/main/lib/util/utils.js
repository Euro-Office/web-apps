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

        it('format takes its arguments from an array', function(){
            assert.equal('b-a', Common.Utils.String.format('{1}-{0}', ['a', 'b']));
        });

        it('ellipsis leaves a string within the limit untouched', function(){
            assert.equal('short', Common.Utils.String.ellipsis('short', 10));
            assert.isUndefined(Common.Utils.String.ellipsis(undefined, 10));
        });

        it('parseFloat accepts a decimal comma', function(){
            var str = Common.Utils.String;

            assert.strictEqual(str.parseFloat('1,5'), 1.5);
            assert.strictEqual(str.parseFloat('2.25'), 2.25);
            assert.strictEqual(str.parseFloat(3), 3);
            assert.isNaN(str.parseFloat('abc'));
        });

        it('encodeSurrogateChar builds a surrogate pair above the BMP', function(){
            var str = Common.Utils.String;

            assert.equal(str.encodeSurrogateChar(0x41), 'A');
            assert.equal(str.encodeSurrogateChar(0xFFFF), '\uFFFF');
            assert.equal(str.encodeSurrogateChar(0x10000), '\uD800\uDC00');
            assert.equal(str.encodeSurrogateChar(0x1F600), String.fromCodePoint(0x1F600));
        });

        it('fixedDigits left-pads to the requested width', function(){
            var str = Common.Utils.String;

            assert.equal(str.fixedDigits(5, 3), '005');
            assert.equal(str.fixedDigits(7, 2, ' '), ' 7');
            assert.equal(str.fixedDigits(1234, 3), '1234', 'never truncates');
        });
    });

    describe('Common.Utils.String.platformKey', function(){
        var isMac;

        beforeEach(function(){ isMac = Common.Utils.isMac; });
        afterEach(function(){ Common.Utils.isMac = isMac; });

        it('spells out the modifiers off the Mac', function(){
            Common.Utils.isMac = false;

            assert.equal(Common.Utils.String.platformKey('Ctrl+Shift+S'), ' (Ctrl+Shift+S)');
            assert.equal(Common.Utils.String.platformKey('ctrl+alt+Del'), ' (Ctrl+Alt+Del)');
        });

        it('uses the Mac glyphs and drops the plus signs', function(){
            Common.Utils.isMac = true;

            assert.equal(Common.Utils.String.platformKey('Ctrl+Shift+S'), ' (⌘⇧S)');
            assert.equal(Common.Utils.String.platformKey('Alt+F'), ' (⌥F)');
        });

        it('keeps a trailing plus that is the key itself', function(){
            Common.Utils.isMac = true;

            assert.equal(Common.Utils.String.platformKey('Ctrl+'), ' (⌘+)');
        });

        it('fills a custom template', function(){
            Common.Utils.isMac = false;

            assert.equal(Common.Utils.String.platformKey('Ctrl+C', '[{0}]'), '[Ctrl+C]');
        });

        it('runs the hook on the Mac only', function(){
            var hook = function(s){ return s.replace('Del', 'Backspace'); };

            Common.Utils.isMac = true;
            assert.equal(Common.Utils.String.platformKey('Ctrl+Del', null, hook), ' (⌘Backspace)');

            Common.Utils.isMac = false;
            assert.equal(Common.Utils.String.platformKey('Ctrl+Del', null, hook), ' (Ctrl+Del)');
        });
    });

    describe('Common.Utils.Metric', function(){
        var metric = Common.Utils.Metric,
            units = metric.c_MetricUnits,
            saved;

        beforeEach(function(){ saved = metric.getCurrentMetric(); });
        afterEach(function(){ metric.setCurrentMetric(saved); });

        it('stores the current metric', function(){
            metric.setCurrentMetric(units.inch);

            assert.equal(metric.getCurrentMetric(), units.inch);
            assert.equal(metric.getCurrentMetricName(), '"');
        });

        it('names each unit and falls back to cm', function(){
            assert.equal(metric.getMetricName(units.cm), 'cm');
            assert.equal(metric.getMetricName(units.pt), 'pt');
            assert.equal(metric.getMetricName(units.inch), '"');
            assert.equal(metric.getMetricName(), 'cm');
        });

        it('converts to mm from each unit', function(){
            metric.setCurrentMetric(units.cm);
            assert.equal(metric.fnRecalcToMM(2.5), 25);

            metric.setCurrentMetric(units.pt);
            assert.closeTo(metric.fnRecalcToMM(72), 25.4, 1e-9);

            metric.setCurrentMetric(units.inch);
            assert.closeTo(metric.fnRecalcToMM(2), 50.8, 1e-9);
        });

        it('passes null and undefined through fnRecalcToMM', function(){
            metric.setCurrentMetric(units.cm);

            assert.isNull(metric.fnRecalcToMM(null));
            assert.isUndefined(metric.fnRecalcToMM(undefined));
        });

        it('converts from mm and rounds per unit', function(){
            metric.setCurrentMetric(units.cm);
            assert.strictEqual(metric.fnRecalcFromMM(12.34567), 1.2346);

            metric.setCurrentMetric(units.pt);
            assert.strictEqual(metric.fnRecalcFromMM(25.4), 72);
            assert.strictEqual(metric.fnRecalcFromMM(10), 28.346);

            metric.setCurrentMetric(units.inch);
            assert.strictEqual(metric.fnRecalcFromMM(10), 0.394);
        });

        it('returns the value unchanged for an unknown unit', function(){
            metric.setCurrentMetric(99);

            assert.equal(metric.fnRecalcToMM(5), 5);
            assert.equal(metric.fnRecalcFromMM(5), 5);
        });

        it('round-trips through mm', function(){
            [units.cm, units.pt, units.inch].forEach(function(unit){
                metric.setCurrentMetric(unit);
                assert.closeTo(metric.fnRecalcFromMM(metric.fnRecalcToMM(1.5)), 1.5, 1e-3);
            });
        });
    });

    describe('Common.Utils.ThemeColor', function(){
        var theme = Common.Utils.ThemeColor;

        it('getHexColor zero-pads each channel', function(){
            assert.equal(theme.getHexColor(0, 0, 0), '000000');
            assert.equal(theme.getHexColor(255, 10, 171), 'ff0aab');
        });

        it('getTranslation maps known names and passes others through', function(){
            assert.equal(theme.getTranslation('Dark Red'), 'Dark red');
            assert.equal(theme.getTranslation('Mauve'), 'Mauve');
            assert.equal(theme.getTranslation(''), '');
        });

        it('getEffectTranslation reads a tint as a percentage', function(){
            assert.equal(theme.getEffectTranslation(0.4), 'Lighter 40%');
            assert.equal(theme.getEffectTranslation(-0.25), 'Darker 25%');
            assert.equal(theme.getEffectTranslation(0), '');
        });

        describe('with Asc.asc_CColor', function(){
            var savedAsc;

            // getRgbColor builds an sdkjs colour; record what it is fed.
            var FakeColor = function(){};
            ['type', 'r', 'g', 'b', 'a', 'value'].forEach(function(key){
                FakeColor.prototype['put_' + key] = function(v){ this[key] = v; };
            });

            beforeEach(function(){
                savedAsc = window.Asc;
                window.Asc = { asc_CColor: FakeColor, c_oAscColor: { COLOR_TYPE_SRGB: 1, COLOR_TYPE_SCHEME: 2 } };
            });
            afterEach(function(){ window.Asc = savedAsc; });

            it('getRgbColor parses a hex string as sRGB', function(){
                var c = theme.getRgbColor('#1a2B3c');

                assert.deepEqual([c.r, c.g, c.b, c.a], [0x1a, 0x2b, 0x3c, 0xff]);
                assert.equal(c.type, 1);
                assert.isUndefined(c.value);
            });

            it('getRgbColor expands shorthand hex', function(){
                var c = theme.getRgbColor('f80');

                assert.deepEqual([c.r, c.g, c.b], [0xff, 0x88, 0x00]);
            });

            it('getRgbColor marks a theme colour as scheme', function(){
                var c = theme.getRgbColor({color: '00FF00', effectId: 12});

                assert.equal(c.type, 2);
                assert.equal(c.value, 12);
                assert.equal(c.g, 255);
            });

            it('getRgbColor treats an object without effectId as sRGB', function(){
                var c = theme.getRgbColor({color: '0000ff'});

                assert.equal(c.type, 1);
                assert.equal(c.b, 255);
            });
        });

        describe('effect colours', function(){
            var saved;

            var ascColor = function(idx){
                return {
                    get_r: function(){ return idx; }, get_g: function(){ return 0; }, get_b: function(){ return 0; },
                    asc_getName: function(){ return ''; },
                    asc_getNameInColorScheme: function(){ return ''; },
                    asc_getEffectValue: function(){ return 0; }
                };
            };

            beforeEach(function(){ saved = theme.effectcolors; });
            afterEach(function(){ theme.effectcolors = saved; });

            it('setColors lays the 6x10 palette out column by column', function(){
                var colors = [];
                for (var i = 0; i < 60; i++) colors.push(ascColor(i));

                theme.setColors(colors);
                var effect = theme.getEffectColors();

                assert.lengthOf(effect, 60);
                // entry k comes from column k/10, row k%10
                assert.equal(effect[1].effectId, 6);
                assert.equal(effect[1].color, '060000');
                assert.equal(effect[1].effectValue, theme.ThemeValues[1]);
                assert.equal(effect[10].effectId, 1);
            });

            it('colorValue2EffectId finds the id by value and colour, ignoring case', function(){
                theme.effectcolors = [
                    {color: 'aa0000', effectId: 3, effectValue: 6},
                    {color: 'BB0000', effectId: 9, effectValue: 6}
                ];

                assert.equal(theme.colorValue2EffectId({color: 'bb0000', effectValue: 6}).effectId, 9);
                assert.isUndefined(theme.colorValue2EffectId({color: 'cc0000', effectValue: 6}).effectId);
                assert.equal(theme.colorValue2EffectId('aa0000'), 'aa0000', 'plain colour passes through');
            });
        });
    });

    describe('Common.Utils.RGBColor', function(){
        var rgb = function(str){
            var c = new Common.Utils.RGBColor(str);
            return [c.r, c.g, c.b];
        };

        it('parses hex with and without the hash', function(){
            assert.deepEqual(rgb('#00ff00'), [0, 255, 0]);
            assert.deepEqual(rgb('336699'), [0x33, 0x66, 0x99]);
            assert.deepEqual(rgb('#ABCDEF'), [0xab, 0xcd, 0xef]);
        });

        it('parses shorthand hex', function(){
            assert.deepEqual(rgb('#fb0'), [0xff, 0xbb, 0x00]);
        });

        it('parses rgb() with or without spaces', function(){
            assert.deepEqual(rgb('rgb(123, 234, 45)'), [123, 234, 45]);
            assert.deepEqual(rgb('RGB(1,2,3)'), [1, 2, 3]);
        });

        it('clamps out-of-range rgb channels', function(){
            assert.deepEqual(rgb('rgb(300,0,999)'), [255, 0, 255]);
        });

        it('parses hsb()', function(){
            assert.deepEqual(rgb('hsb(0, 100, 100)'), [255, 0, 0]);
            assert.deepEqual(rgb('hsb(120, 100, 100)'), [0, 255, 0]);
            assert.deepEqual(rgb('hsb(240, 100, 100)'), [0, 0, 255]);
            assert.deepEqual(rgb('hsb(360, 100, 100)'), [255, 0, 0], '360 wraps to 0');
            assert.deepEqual(rgb('hsb(0, 0, 50)'), [128, 128, 128], 'no saturation is grey');
        });

        it('falls back to black for an unparsable string', function(){
            assert.deepEqual(rgb('not a colour'), [0, 0, 0]);
            assert.deepEqual(rgb('zzzzzz'), [0, 0, 0]);
        });

        it('formats itself as hex, rgb and rgba', function(){
            var c = new Common.Utils.RGBColor('rgb(10, 0, 255)');

            assert.equal(c.toHex(), '#0a00ff');
            assert.equal(c.toRGB(), 'rgb(10, 0, 255)');
            assert.equal(c.toRGBA(), 'rgba(10, 0, 255, 1)');
            assert.equal(c.toRGBA(0.5), 'rgba(10, 0, 255, 0.5)');
        });

        it('converts to hsb', function(){
            assert.deepEqual(new Common.Utils.RGBColor('ff0000').toHSB(), {h: 0, s: 100, b: 100});
            assert.deepEqual(new Common.Utils.RGBColor('0000ff').toHSB(), {h: 240, s: 100, b: 100});
            assert.deepEqual(new Common.Utils.RGBColor('ff00ff').toHSB(), {h: 300, s: 100, b: 100});
            assert.deepEqual(new Common.Utils.RGBColor('000000').toHSB(), {h: 0, s: 0, b: 0});
        });

        it('compares channels with isEqual', function(){
            var c = new Common.Utils.RGBColor('#102030');

            assert.isTrue(c.isEqual({r: 16, g: 32, b: 48}));
            assert.isFalse(c.isEqual({r: 16, g: 32, b: 49}));
        });

        it('tells dark from light by perceived brightness', function(){
            assert.isTrue(new Common.Utils.RGBColor('#000000').isDark());
            assert.isTrue(new Common.Utils.RGBColor('#0000ff').isDark());
            assert.isFalse(new Common.Utils.RGBColor('#ffffff').isDark());
            assert.isFalse(new Common.Utils.RGBColor('#ffff00').isDark());
        });
    });
});