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

// Pure selection/disabled-state logic, split out of editor.jsx so it has zero dependency on
// React/icon imports (editor.jsx pulls in webpack-only asset aliases that can't resolve outside a
// webpack build, which made this logic untestable in place) and so it's directly unit-testable.
// No behavior change from the version previously inline in editor.jsx.

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/spreadsheeteditor/mobile/app/controller/edit/EditContainer.js
// (onApiSelectionChanged's selType switch: RangeCells/RangeRow/RangeCol/RangeMax fall through to
// the "definitely not an object" branch; RangeImage/RangeShape/RangeChart/RangeChartText/RangeShapeText
// are the object-type ones). Note the SAME file's onApiFocusObject computed an identical object-type
// tag array from `_focusObjects` (matching store.objects's existing logic below almost verbatim) but
// then immediately discarded it with a "// TODO: DEBUG ONLY" reset -- dead code in that 2018 Backbone
// build. store.objects/intf.getShapeObject/etc. (React-era, already in this repo) are clearly written
// expecting asc_onFocusObject to actually work, so it's kept wired in editor.jsx on the assumption
// the current SDK build fixed what was broken in 2018 -- the one inferred piece in this file.
export function isObjectSelectionType(selectionType) {
    switch (selectionType) {
        case Asc.c_oAscSelectionType.RangeChart:
        case Asc.c_oAscSelectionType.RangeImage:
        case Asc.c_oAscSelectionType.RangeShape:
        case Asc.c_oAscSelectionType.RangeChartText:
        case Asc.c_oAscSelectionType.RangeShapeText:
            return true;
        default:
            return false;
    }
}

// ported from EditContainer.js's onApiSelectionChanged else-branch: `_settings.push('cell'); if
// (cellInfo.asc_getHyperlink()) _settings.push('hyperlink');`
export function getCellSelectionTags(cellInfo) {
    return cellInfo.asc_getHyperlink() ? ['cell', 'hyperlink'] : ['cell'];
}

// `wsProps` has no Backbone precedent at all -- confirmed by reading the full Backbone Toolbar.js:
// it disabled 'add'/'edit' identically from one `islocked` value with no worksheet-protection
// concept. wsProps.Objects is a React-era addition, but it's real and load-bearing elsewhere in
// this exact app: EditingPage.jsx:98,105,119 gate *editing* an already-selected object on
// `wsProps.Objects && store.isLockedShape` (both must be true -- protection alone doesn't block
// editing an unlocked object), while AddingPage.jsx:80 and AddOther.jsx:31 gate *inserting a new*
// object on `wsProps.Objects` alone (there's no specific object yet to check the lock state of).
// 'edit' and 'add' therefore need genuinely different disabled logic, not one shared flag.
export function computeToolbarEditAddDisabled({disabled, wsProps, focusOn, isShapeLocked}) {
    return {
        isEditDisabled: disabled || (focusOn === 'obj' && wsProps.Objects && isShapeLocked),
        isAddDisabled: disabled || wsProps.Objects,
    };
}
