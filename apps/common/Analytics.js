/*
 * Copyright (C) Ascensio System SIA, 2009-2026
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation, together with the
 * additional terms provided in the LICENSE file.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. For
 * details, see the GNU AGPL at: https://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA by email at info@onlyoffice.com
 * or by postal mail at 20A-6 Ernesta Birznieka-Upisha Street, Riga,
 * LV-1050, Latvia, European Union.
 *
 * The interactive user interfaces in modified versions of the Program
 * are required to display Appropriate Legal Notices in accordance with
 * Section 5 of the GNU AGPL version 3.
 *
 * No trademark rights are granted under this License.
 *
 * All non-code elements of the Product, including illustrations,
 * icon sets, and technical writing content, are licensed under the
 * Creative Commons Attribution-ShareAlike 4.0 International License:
 * https://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 * This license applies only to such non-code elements and does not
 * modify or replace the licensing terms applicable to the Program's
 * source code, which remains licensed under the GNU Affero General
 * Public License v3.
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
if (window.Common === undefined)
    window.Common = {};

Common.component = Common.component || {};

    Common.Analytics = Common.component.Analytics = new(function() {
        var _category;

        return {
            initialize: function(id, category) {

                if (typeof id === 'undefined')
                    throw 'Analytics: invalid id.';

                if (typeof category === 'undefined' || Object.prototype.toString.apply(category) !== '[object String]')
                    throw 'Analytics: invalid category type.';

                _category = category;

                $('head').append(
                    '<script type="text/javascript">' +
                    'var _gaq = _gaq || [];' +
                    '_gaq.push(["_setAccount", "' + id + '"]);' +
                    '_gaq.push(["_trackPageview"]);' +
                    '(function() {' +
                    'var ga = document.createElement("script"); ga.type = "text/javascript"; ga.async = true;' +
                    'ga.src = ("https:" == document.location.protocol ? "https://ssl" : "http://www") + ".google-analytics.com/ga.js";' +
                    'var s = document.getElementsByTagName("script")[0]; s.parentNode.insertBefore(ga, s);' +
                    '})();' +
                    '</script>'
                );
            },

            trackEvent: function(action, label, value) {

                if (typeof action !== 'undefined' && Object.prototype.toString.apply(action) !== '[object String]')
                    throw 'Analytics: invalid action type.';

                if (typeof label !== 'undefined' && Object.prototype.toString.apply(label) !== '[object String]')
                    throw 'Analytics: invalid label type.';

                if (typeof value !== 'undefined' && !(Object.prototype.toString.apply(value) === '[object Number]' && isFinite(value)))
                    throw 'Analytics: invalid value type.';

                if (typeof _gaq === 'undefined')
                    return;

                if (_category === 'undefined')
                    throw 'Analytics is not initialized.';

                _gaq.push(['_trackEvent', _category, action, label, value]);
            }
        }
    })();
