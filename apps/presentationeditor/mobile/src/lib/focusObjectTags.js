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

// Pure focus-object classification logic, split out of editor.jsx so it has zero dependency on
// React/icon imports (editor.jsx pulls in webpack-only asset aliases that can't resolve outside a
// webpack build, which made this logic untestable in place) and so it's directly unit-testable.
// No behavior change from the version previously inline in editor.jsx.

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/presentationeditor/mobile/app/controller/edit/EditContainer.js
// onApiFocusObject -- re-fetched and read in full after an earlier pass here relied on guesswork
// instead of this file. Real logic, faithfully translated: locked objects are excluded entirely
// (get_Locked() / the four Slide lock flags); 'text' is a *derived* flag (true if any unlocked
// Paragraph, Table, or non-chart Shape was found), unshifted rather than pushed per-object; Shape
// excludes chart-derived shapes via get_FromChart(); the tag is 'hyperlink', not 'link' (confirmed
// load-bearing: EditLink.jsx, AddOther.jsx both check 'hyperlink' directly) and is dropped if
// 'text' isn't also present; 'shape' is dropped if 'chart' is present.
export function filterFocusObjects(objects) {
    const tags = [];
    let hasText = false;
    objects.forEach((object) => {
        const type = object.get_ObjectType();
        const value = object.get_ObjectValue();
        if (type === Asc.c_oAscTypeSelectElement.Paragraph) {
            if (!value.get_Locked()) hasText = true;
        } else if (type === Asc.c_oAscTypeSelectElement.Table) {
            if (!value.get_Locked()) { tags.push('table'); hasText = true; }
        } else if (type === Asc.c_oAscTypeSelectElement.Slide) {
            if (!(value.get_LockLayout() || value.get_LockBackground() || value.get_LockTranzition() || value.get_LockTiming())) {
                tags.push('slide');
            }
        } else if (type === Asc.c_oAscTypeSelectElement.Image) {
            if (!value.get_Locked()) tags.push('image');
        } else if (type === Asc.c_oAscTypeSelectElement.Chart) {
            if (!value.get_Locked()) tags.push('chart');
        } else if (type === Asc.c_oAscTypeSelectElement.Shape && !value.get_FromChart()) {
            if (!value.get_Locked()) { tags.push('shape'); hasText = true; }
        } else if (type === Asc.c_oAscTypeSelectElement.Hyperlink) {
            tags.push('hyperlink');
        }
    });
    if (hasText) tags.unshift('text');

    let result = tags;
    if (result.indexOf('hyperlink') > -1 && result.indexOf('text') < 0) {
        result = result.filter(t => t !== 'hyperlink');
    }
    if (result.indexOf('chart') > -1) {
        result = result.filter(t => t !== 'shape');
    }
    return [...new Set(result)];
}

export const isType = (type) => (o) => o.get_ObjectType() === type && !!o.get_ObjectValue();

// All seven getXObject entries in intf (editor.jsx) are the exact same shape -- getTopFocusObject
// filtered by a single Asc.c_oAscTypeSelectElement type, no special-casing -- so the lookup is a
// straight name-to-type table rather than 7 near-identical lines.
export const TOP_OBJECT_TYPES = {
    getSlideObject: Asc.c_oAscTypeSelectElement.Slide,
    getParagraphObject: Asc.c_oAscTypeSelectElement.Paragraph,
    getShapeObject: Asc.c_oAscTypeSelectElement.Shape,
    getImageObject: Asc.c_oAscTypeSelectElement.Image,
    getTableObject: Asc.c_oAscTypeSelectElement.Table,
    getChartObject: Asc.c_oAscTypeSelectElement.Chart,
    getLinkObject: Asc.c_oAscTypeSelectElement.Hyperlink,
};
