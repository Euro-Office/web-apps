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

import React, { Fragment } from 'react';
import ToolbarIconLink from '../../../../common/mobile/lib/component/ToolbarIconLink';
import { EditCommentControllers } from '../../../../common/mobile/lib/controller/collaboration/Comments';
import { initThemeColors } from '../../../../common/mobile/lib/initThemeColors';
import { getTopFocusObject } from '../../../../common/mobile/lib/getTopFocusObject';
import { toolbarIcons } from '../../../../common/mobile/lib/toolbarIcons';
import { classifyImageObject, filterFocusObjects } from './focusObjectTags';

// SDK `api` access: call sites pass store arguments only (no `api`), matching the Backbone
// predecessors' `setApi(api)` lifecycle only in effect, not in signature. `Common.EditorApi.get()`
// (already used this way in apps/spreadsheeteditor/mobile/src/store/focusObjects.js:113) is the
// equivalent accessor in this codebase.

export { initThemeColors };

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/documenteditor/mobile/app/controller/Toolbar.js:158-170
// (onApiFocusObject, disabled-state) and app/view/Toolbar.js (events: "click #toolbar-edit" / "click #toolbar-add")
// TODO: icon choice (icon-edit.svg / icon-plus.svg) is a best-effort pick from the existing
// @common-ios-icons/@common-android-icons asset sets -- the Backbone view template used 2016-era
// jQuery/CSS icon fonts with no equivalent in this SVG pipeline, so no icon asset was actually
// sourced. Confirm against design before shipping.
export function getToolbarOptions({ disabled, onEditClick, onAddClick }) {
    return (
        <Fragment>
            <ToolbarIconLink id="toolbar-edit" disabled={disabled} onClick={onEditClick} icon={toolbarIcons.edit} />
            <ToolbarIconLink id="toolbar-add" disabled={disabled} onClick={onAddClick} icon={toolbarIcons.add} />
        </Fragment>
    );
}

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/documenteditor/mobile/app/controller/Toolbar.js:130-138
// (onUndo/onRedo -> api.Undo()/api.Redo()) and :142-150 (onApiCanRevert, disabled-state from
// asc_onCanUndo/asc_onCanRedo). Purely a rendering gap: current Main.jsx (lines 1027-1034) already
// registers asc_onCanUndo/asc_onCanRedo into storeToolbarSettings and the
// current call site already supplies onUndoClick/onRedoClick/disabledUndo/disabledRedo -- no new SDK
// wiring needed here.
export function getUndoRedo({ disabledUndo, disabledRedo, onUndoClick, onRedoClick }) {
    return (
        <Fragment>
            <ToolbarIconLink id="btn-undo" disabled={disabledUndo} onClick={onUndoClick} icon={toolbarIcons.undo} />
            <ToolbarIconLink id="btn-redo" disabled={disabledRedo} onClick={onRedoClick} icon={toolbarIcons.redo} />
        </Fragment>
    );
}

// ported from apps/common/main/lib/controller/Fonts.js:101-121 (onApiLoadFonts) and :146
// (asc_registerCallback('asc_onInitEditorFonts', ...)); corroborated by ONLYOFFICE/web-apps@v5.4.99.1767
// apps/documenteditor/mobile/app/controller/edit/EditText.js:59-72,96 (mobile predecessor of the same
// SDK contract). storeTextSettings.initEditorFonts(fonts, select) (confirmed by reading
// apps/documenteditor/mobile/src/store/textSettings.js:90-136) already builds the
// {id, name, imgidx, type} array and drives the thumbnail-sprite loading -- this is pure wiring.
export function initFonts(store) {
    Common.EditorApi.get().asc_registerCallback('asc_onInitEditorFonts', (fonts, select) => {
        // SDK callback collections are array-like, not real JS Arrays (no for-of/map/find) --
        // confirmed via a runtime "e is not iterable" crash in the asc_onInitTableTemplates
        // callback below; normalizing defensively wherever a raw SDK collection is consumed.
        store.initEditorFonts(Array.from(fonts || []), select);
    });
}

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/documenteditor/mobile/app/controller/edit/EditParagraph.js:88
// (asc_registerCallback('asc_onInitEditorStyles', ...)) and :391-410 (onApiInitEditorStyles).
// storeParagraphSettings.initEditorStyles(styles) (confirmed by reading
// apps/documenteditor/mobile/src/store/paragraphSettings.js:22-28) is an exact match for the Backbone
// body already -- the cleanest, most directly-portable of all 9 methods.
export function initEditorStyles(store) {
    Common.EditorApi.get().asc_registerCallback('asc_onInitEditorStyles', (styles) => {
        store.initEditorStyles(styles);
    });
}

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/documenteditor/mobile/app/controller/edit/EditContainer.js:66
// (asc_registerCallback('asc_onFocusObject', ...)) and :341-380 (onApiFocusObject tag-array logic);
// corroborated by the per-type asc_onFocusObject handlers in EditTable.js:632-649, EditParagraph.js:372-387,
// and by the same pattern in EditHeader.js/EditShape.js/EditImage.js/EditHyperlink.js/EditChart.js.
// storeFocusObjects (confirmed by reading apps/documenteditor/mobile/src/store/focusObjects.js) already
// has resetFocusObjects(objects) and a full set of getters (settings/headerObject/paragraphObject/
// shapeObject/imageObject/tableObject/chartObject/linkObject) that all delegate to `this.intf`, which
// nothing currently sets -- this function is exactly what must construct that `intf`. The header-type
// quirk (_headerType = object.get_ObjectValue().get_Type()) is already handled independently by the
// store's own `headerType` getter scanning `_focusObjects`, so it isn't duplicated here.
export { classifyImageObject, filterFocusObjects };

export function initFocusObjects(store) {
    store.intf = {
        filterFocusObjects: () => filterFocusObjects(store._focusObjects),
        getHeaderObject: () => getTopFocusObject(store._focusObjects, o => o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Header),
        getParagraphObject: () => getTopFocusObject(store._focusObjects, o => o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Paragraph),
        // Each Image-type matcher below binds get_ObjectValue() to a local once and guards it --
        // matching presentationeditor's isType() defensiveness for the same asc_onFocusObject
        // contract, rather than assuming it's always truthy (also drops the redundant repeat calls
        // the un-guarded version had).
        getShapeObject: () => getTopFocusObject(store._focusObjects, o => {
            const value = o.get_ObjectValue();
            return o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Image && !!value && classifyImageObject(value) === 'shape';
        }),
        getImageObject: () => getTopFocusObject(store._focusObjects, o => {
            const value = o.get_ObjectValue();
            return o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Image && !!value && classifyImageObject(value) === 'image';
        }),
        getTableObject: () => getTopFocusObject(store._focusObjects, o => o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Table),
        getChartObject: () => getTopFocusObject(store._focusObjects, o => {
            const value = o.get_ObjectValue();
            return o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Image && !!value && classifyImageObject(value) === 'chart';
        }),
        getLinkObject: () => getTopFocusObject(store._focusObjects, o => o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Hyperlink),
    };

    Common.EditorApi.get().asc_registerCallback('asc_onFocusObject', (objects) => {
        // array-like SDK collection, not a real Array -- see initFonts above.
        store.resetFocusObjects(Array.from(objects || []));
    });
}

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/documenteditor/mobile/app/controller/add/AddTable.js:78
// (asc_registerCallback('asc_onInitTableTemplates', ...)) and :180-186 (onApiInitTemplates).
// storeTableSettings.setStyles(arrStyles, typeStyles) (confirmed by reading
// apps/documenteditor/mobile/src/store/tableSettings.js:33-46) already builds the exact
// {imageUrl, templateId} shape -- pure wiring. The trigger call (asc_GetDefaultTableStyles()) is
// already present in Main.jsx:418, unrelated to this function.
export function initTableTemplates(store) {
    Common.EditorApi.get().asc_registerCallback('asc_onInitTableTemplates', (templates) => {
        // Confirmed via runtime testing: this SDK collection is array-like, not a real Array --
        // tableSettings.js's setStyles does `for (let template of arrStyles)`, which throws
        // "e is not iterable" without this conversion.
        store.setStyles(Array.from(templates || []));
    });
}

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/documenteditor/mobile/app/controller/edit/EditChart.js:137
// (asc_registerCallback('asc_onUpdateChartStyles', ...)), :567-570 (onApiUpdateChartStyles) and :575-579
// (_updateChartStyles). storeChartSettings.updateChartStyles(styles) (confirmed by reading
// apps/documenteditor/mobile/src/store/chartSettings.js:82-84) already stores the array and its `styles`
// getter already lays it into a grid. The old Backbone code needed the focused chart's type to call
// api.asc_getChartPreviews(type); storeFocusObjects.chartObject (populated by initFocusObjects above,
// via the `intf.getChartObject` delegate) is passed in for exactly that reason.
// Re-verified directly against EditChart.js:567-570's onApiUpdateChartStyles: `if (this.api &&
// _chartObject && _chartObject.get_ChartProperties()) { this._updateChartStyles(this.api.asc_getChartPreviews(
// _chartObject.get_ChartProperties().getType())); }` -- the two-store relationship matches exactly.
// The `get_ChartProperties()` guard is satisfied by construction here (getChartObject only ever
// returns objects that already passed that same check), so it's implicit rather than re-checked.
// Ordering dependency: initFocusObjects must have registered (and fired at least once) before this
// callback can resolve a chart type; both are registered once at mount, so this is a non-issue.
export function updateChartStyles(chartStore, focusStore) {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onUpdateChartStyles', () => {
        const chartObject = focusStore && focusStore.chartObject;
        if (!chartObject) return;
        const styles = api.asc_getChartPreviews(chartObject.get_ChartProperties().getType());
        // array-like SDK collection, not a real Array -- see initFonts above.
        chartStore.updateChartStyles(Array.from(styles || []));
    });
}

// apps/common/mobile/lib/controller/collaboration/Comments.jsx already fully implements and exports
// AddCommentController/EditCommentController -- complete, working, AGPL, mobx-wired React components.
// Neither is currently instantiated anywhere in documenteditor's MainController.render(); this closes
// that gap via the shared EditCommentControllers wrapper (also used by presentationeditor).
export function getEditCommentControllers() {
    return <EditCommentControllers />;
}
