/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

define([
    'common/main/lib/component/Window'
], function() {
    describe('Common.UI.Window accessible name', function() {
        var win;
        var oldGateway;
        var oldGetCurrentLanguage;

        before(function() {
            oldGateway = Common.Gateway;
            oldGetCurrentLanguage = Common.Locale.getCurrentLanguage;
            Common.Gateway = {on: function() {}};
            Common.Locale.getCurrentLanguage = function() { return 'en'; };
        });

        after(function() {
            Common.Gateway = oldGateway;
            Common.Locale.getCurrentLanguage = oldGetCurrentLanguage;
        });

        afterEach(function() {
            if (win) {
                win.close(true);
                win = null;
            }
        });

        it('labels the dialog with the visible header title', function() {
            var id = 'window-accessible-name';
            win = new Common.UI.Window({
                id: id,
                title: 'Accessible title',
                modal: false
            });
            win.render();

            var dialog = document.getElementById(id);
            assert.equal(dialog.getAttribute('role'), 'dialog');
            assert.equal(dialog.getAttribute('aria-labelledby'), id + '-title');
            assert.equal(dialog.querySelector('.title').id, id + '-title');
            assert.equal(dialog.querySelector('.title').textContent, 'Accessible title');
        });

        it('labels alert dialogs with their visible header title', function() {
            var id = 'window-accessible-alert';
            win = new Common.UI.Window({
                id: id,
                title: 'Warning title',
                role: 'alertdialog',
                modal: false
            });
            win.render();

            var dialog = document.getElementById(id);
            assert.equal(dialog.getAttribute('role'), 'alertdialog');
            assert.equal(dialog.getAttribute('aria-labelledby'), id + '-title');
            assert.equal(dialog.querySelector('.title').id, id + '-title');
        });

        it('does not reference a title when the header is hidden', function() {
            var id = 'window-without-header';
            win = new Common.UI.Window({
                id: id,
                header: false,
                modal: false
            });
            win.render();

            var dialog = document.getElementById(id);
            assert.isNull(dialog.getAttribute('aria-labelledby'));
            assert.isNull(dialog.querySelector('.title'));
        });
    });
});
