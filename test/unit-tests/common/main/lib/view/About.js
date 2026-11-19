/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 *  About.js
 *
 *  Unit test
 *
 *  Covers the provider block that customization.customer fills: which lines
 *  are shown, when it replaces the publisher block, the e-mail check and the
 *  logo picked for the current theme.
 *
 */

define([
    'backbone',
    'common/main/lib/util/utils',
    'common/main/lib/view/About'
],function() {
    describe('Common.Views.About', function(){
        var about,
            isDark = false,
            warnings = [],
            consoleWarn,
            domPlaceholder = document.createElement('div');

        // returns the visible provider lines as text, links appended in brackets
        var visibleLines = function () {
            return $('#id-about-licensee-info tr').filter(function () {
                return !$(this).hasClass('hidden');
            }).map(function () {
                var a = $(this).find('a');
                return $.trim($(this).text()).replace(/\s+/g, ' ') + (a.length ? ' [' + a.attr('href') + ']' : '');
            }).get().filter(function (text) {
                return text && !/^TEST EDITOR|^Version/.test(text);
            });
        };

        var providerShown = function () {
            return !$('#id-about-licensee-info').hasClass('hidden');
        };

        var showAbout = function (customer) {
            about = new Common.Views.About({appName: 'test editor', el: domPlaceholder});
            about.render();
            about.setLicInfo({customer: customer});
        };

        before(function () {
            // build-time values and the theme state About reads
            window.__ABOUT_BUILD_INFO__ = '';
            window.__ABOUT_LEGAL__ = '';
            Common.UI.Themes = Common.UI.Themes || {};
            Common.UI.Themes.isDarkTheme = function () { return isDark; };
        });

        beforeEach(function(){
            isDark = false;
            warnings = [];
            consoleWarn = console.warn;
            console.warn = function () { warnings.push(_.toArray(arguments)); };
            $('body').append(domPlaceholder);
        });

        afterEach(function(){
            console.warn = consoleWarn;
            Common.NotificationCenter.off('uitheme:changed');
            about = null;
            $(domPlaceholder).empty().removeClass('about-dlg');
        });

        it('keeps the publisher block when no customer value is set', function(){
            [
                {},
                {name: '', address: '', mail: '', phone: '', www: '', info: '', logo: '', logoDark: ''},
                {name: '  ', address: ' ', mail: ' ', salesMail: ' ', logo: ' '},
                {phone: 1234567},
                {mail: 'a b@example.com'}
            ].forEach(function (customer) {
                showAbout(customer);
                assert.isFalse(providerShown(), JSON.stringify(customer));
                assert.isFalse($('#id-about-licensor-info').hasClass('hidden'), 'publisher block, ' + JSON.stringify(customer));
                $(domPlaceholder).empty();
            });
        });

        it('shows only the lines that are set, trimmed', function(){
            showAbout({name: '  Example Hosting ', mail: 'not-an-address', phone: '+49 30 1234567'});
            assert.isTrue(providerShown());
            assert.deepEqual(visibleLines(), ['Example Hosting', 'tel.: +49 30 1234567']);
        });

        it('shows the full block in order, with the sales line after the e-mail line', function(){
            showAbout({name: 'Example Hosting', address: 'Example Street 1, Berlin', mail: 'support@example.com',
                       salesMail: 'sales@example.com', phone: '+49 30 1234567', www: 'www.example.com', info: 'Hosted'});
            assert.deepEqual(visibleLines(), [
                'Example Hosting',
                'address: Example Street 1, Berlin',
                'email: support@example.com [mailto:support@example.com]',
                'sales: sales@example.com [mailto:sales@example.com]',
                'tel.: +49 30 1234567',
                'www.example.com [http://www.example.com]',
                'Hosted'
            ]);
        });

        it('accepts a plain address with surrounding spaces or a mailto: prefix', function(){
            showAbout({mail: '  support@example.com ', salesMail: 'MAILTO:sales@example.com'});
            assert.deepEqual(visibleLines(), [
                'email: support@example.com [mailto:support@example.com]',
                'sales: sales@example.com [mailto:sales@example.com]'
            ]);
            assert.lengthOf(warnings, 0);
        });

        it('hides and reports an e-mail value that is not a plain address', function(){
            var rejected = ['Support <support@example.com>', 'a@example.com, b@example.com', 'a@example.com?cc=b@example.com',
                            'a@example.com;b@example.com', 'mailto:mailto:a@example.com', 'a"b@example.com'];
            rejected.forEach(function (value) {
                warnings = [];
                showAbout({name: 'Example Hosting', mail: value, salesMail: value});
                assert.deepEqual(visibleLines(), ['Example Hosting'], value);
                assert.lengthOf(warnings, 2, value);
                assert.equal(warnings[0][1], value, 'the value is passed as its own argument');
                $(domPlaceholder).empty();
            });
        });

        it('stays silent for an empty e-mail value', function(){
            showAbout({name: 'Example Hosting', mail: '', salesMail: '   '});
            assert.lengthOf(warnings, 0);
        });

        it('builds the logo as an element, so a quote in the url cannot add markup', function(){
            var value = 'x"><img src=y onerror="window.__aboutPwned=1"><"';
            showAbout({logo: value});
            var imgs = $('#id-about-company-logo img');
            assert.lengthOf(imgs, 1);
            assert.equal(imgs.attr('src'), value);
            assert.isUndefined(imgs.attr('onerror'));
        });

        it('picks the logo for the current theme and falls back to the other one', function(){
            var src = function () { return $('#id-about-company-logo img').attr('src'); };

            showAbout({logo: 'light.png', logoDark: 'dark.png'});
            assert.equal(src(), 'light.png');
            isDark = true;
            Common.NotificationCenter.trigger('uitheme:changed');
            assert.equal(src(), 'dark.png');
            Common.NotificationCenter.off('uitheme:changed');
            $(domPlaceholder).empty();

            isDark = false;
            showAbout({logo: 'light.png', logoDark: '  '});
            isDark = true;
            Common.NotificationCenter.trigger('uitheme:changed');
            assert.equal(src(), 'light.png', 'a blank logoDark keeps the logo');
            Common.NotificationCenter.off('uitheme:changed');
            $(domPlaceholder).empty();

            showAbout({logo: ' ', logoDark: 'dark.png'});
            assert.equal(src(), 'dark.png', 'logoDark is used when logo is not set');
        });
    });
});
