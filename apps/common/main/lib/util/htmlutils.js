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
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

var checkLocalStorage = (function () {
    try {
        localStorage.setItem('test', 1);   // for WebView checking !!window.localStorage not enough
        localStorage.removeItem('test');
        return true;
    }
    catch(e) {
        return false;
    }
})();

if (!window.lang) {
    window.lang = (/(?:&|^)lang=([^&]+)&?/i).exec(window.location.search.substring(1));
    window.lang = window.lang ? window.lang[1] : '';
}
window.lang && (window.lang = window.lang.split(/[\-\_]/)[0].toLowerCase());

var isLangRtl = function (lang) {
    return lang && (/^(ar|he|ur)$/i.test(lang));
}

var ui_rtl = false;
if ( window.nativeprocvars && window.nativeprocvars.rtl !== undefined ) {
    ui_rtl = window.nativeprocvars.rtl;
} else {
    if ( isLangRtl(lang) )
        if ( checkLocalStorage && localStorage.getItem("settings-ui-rtl") !== null )
            ui_rtl = localStorage.getItem("settings-ui-rtl") === '1';
        else ui_rtl = true;
}

if ( ui_rtl && window.isIEBrowser !== true ) {
    document.body.setAttribute('dir', 'rtl');
    document.body.classList.add('rtl');
}
if ( isLangRtl(lang) ) {
    document.body.classList.add('rtl-font');
}
document.body.setAttribute('applang', lang);

function checkScaling() {

}



window.Common = {
    Utils: {
        injectSvgIcons: function (svg_icons_array, force) {

        }
    }
}


if ( !window.uitheme.id && !!params.uitheme ) {
    if ( params.uitheme == 'default-dark' ) {
        window.uitheme.id = window.uitheme.DEFAULT_DARK_THEME_ID;
        window.uitheme.type = 'dark';
    } else
    if ( params.uitheme == 'default-light' ) {
        window.uitheme.id = window.uitheme.DEFAULT_LIGHT_THEME_ID;
        window.uitheme.type = 'light';
    } else
    if ( params.uitheme == 'theme-system' ) {
        window.uitheme.adapt_to_system_theme();
    } else {
        window.uitheme.id = params.uitheme;
        window.uitheme.type = params.uithemetype;
    }
}

if ( !window.uitheme.id ) {
    window.uitheme.adapt_to_system_theme();
} else {
    !window.uitheme.type && params.uitheme && (window.uitheme.type = params.uithemetype);
}

document.body.classList.add(window.uitheme.relevant_theme_id());

if ( window.uitheme.type == 'dark' ) {
    document.body.classList.add("theme-type-dark");

    if ( checkLocalStorage && localStorage.getItem("content-theme") == 'dark' ) {
        document.body.classList.add("content-theme-dark");
    } else {
    // document.body.classList.add("theme-type-ligth");
    }
}

if ( !window.is_system_theme_dark )
    delete window.is_system_theme_dark;
