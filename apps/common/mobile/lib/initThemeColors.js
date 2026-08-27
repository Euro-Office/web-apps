/*
 *
 * (c) Copyright Ascensio System SIA 2010-2019
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
 * You can contact Ascensio System SIA at 20A-12 Ernesta Birznieka-Upisha
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

/*
 * Modified by Euro-Office, 2026: re-implemented for the current React/mobx mobile
 * architecture. Logic ported from the pre-2020 Backbone-based mobile controllers cited per
 * exported method below, not copied verbatim from this file's own original content.
 */

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, app/controller/Main.js (asc_registerCallback('asc_onSendThemeColors', ...) -> onSendThemeColors -> Common.Utils.ThemeColor.setColors(colors, standart_colors)), verified identical across the documenteditor/spreadsheeteditor/presentationeditor mobile controllers at that tag and confirmed as the piece PR #335 gutted.
// Common.Utils.ThemeColor.setColors's signature is confirmed by reading its real definition at
// apps/common/main/lib/util/utils.js:439-486: setColors(colors, standart_colors) where `colors`
// must be an indexable collection of exactly 60 entries (a 6x10 grid read via colors[i+j*6]), each
// with asc_getName()/asc_getNameInColorScheme()/asc_getEffectValue()/get_r()/get_g()/get_b() --
// matching a standard Office theme-color palette shape, which is what asc_onSendThemeColors's
// payload is. `standart_colors` is optional (only used if truthy and non-empty).
export function initThemeColors() {
    Common.EditorApi.get().asc_registerCallback('asc_onSendThemeColors', (colors, standardColors) => {
        Common.Utils.ThemeColor.setColors(colors, standardColors);
    });
}
