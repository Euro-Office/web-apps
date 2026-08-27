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

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/documenteditor/mobile/app/controller/edit/EditContainer.js
// (asc_onFocusObject tag-array logic) and corroborated by the per-type asc_onFocusObject handlers
// in EditTable.js/EditParagraph.js/EditHeader.js/EditShape.js/EditImage.js/EditHyperlink.js/EditChart.js.
// Chart/shape/image are all Image-type focus objects, disambiguated only by which properties are
// present. Extracted separately because this exact three-way check is also needed standalone by
// editor.jsx's getShapeObject/getImageObject/getChartObject matchers.
export function classifyImageObject(value) {
    if (value.get_ChartProperties()) return 'chart';
    if (value.get_ShapeProperties()) return 'shape';
    return 'image';
}

export function filterFocusObjects(objects) {
    let settings = [];
    for (const object of objects) {
        const type = object.get_ObjectType();
        if (Asc.c_oAscTypeSelectElement.Paragraph === type) {
            settings.push('text', 'paragraph');
        } else if (Asc.c_oAscTypeSelectElement.Table === type) {
            settings.push('table');
        } else if (Asc.c_oAscTypeSelectElement.Image === type) {
            settings.push(classifyImageObject(object.get_ObjectValue()));
        } else if (Asc.c_oAscTypeSelectElement.Hyperlink === type) {
            settings.push('hyperlink');
        } else if (Asc.c_oAscTypeSelectElement.Header === type) {
            settings.push('header');
        }
    }
    if (settings.indexOf('chart') > -1) {
        settings = settings.filter(s => s !== 'shape'); // charts are Image objects with ChartProperties, see EditContainer.js
    }
    return [...new Set(settings)];
}
