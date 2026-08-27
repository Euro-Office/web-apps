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

import ToolbarIconLink from '../../../../common/mobile/lib/component/ToolbarIconLink';
import { initThemeColors } from '../../../../common/mobile/lib/initThemeColors';
import { getTopFocusObject } from '../../../../common/mobile/lib/getTopFocusObject';
import { toolbarIcons } from '../../../../common/mobile/lib/toolbarIcons';
import { isObjectSelectionType, getCellSelectionTags, computeToolbarEditAddDisabled } from './selectionRules';
import React, { Fragment } from 'react';

export { initThemeColors };

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/spreadsheeteditor/mobile/app/controller/Toolbar.js:163-198
// (onApiCanRevert / onApiSelectionChanged). The Backbone controller toggled a
// #toolbar-undo/#toolbar-redo `disabled` class and called disableControl(['add','edit'], islocked);
// the actual undo/redo/lock *state* computation already lives in the modern code
// (Main.jsx asc_onCanUndoChanged/asc_onCanRedoChanged, store/focusObjects.js setIsLocked), so this
// object only renders buttons from the already-computed flags handed in via props — no state
// recomputation happens here. The paired Backbone view/Toolbar.js template (exact original
// markup/ids) was not fetched; 'toolbar-undo'/'toolbar-redo'/'toolbar-edit'/
// 'toolbar-add' ids below are carried over from the Backbone controller's own id selectors
// (undo/redo confirmed at Toolbar.js:163-171) and, for edit/add, inferred from that same
// naming convention rather than confirmed against the view template.
export const toolbarOptions = {
    getUndoRedo({disabledUndo, disabledRedo, onUndoClick, onRedoClick}) {
        return (
            <Fragment>
                <ToolbarIconLink id="toolbar-undo" disabled={disabledUndo} onClick={onUndoClick} icon={toolbarIcons.undo} />
                <ToolbarIconLink id="toolbar-redo" disabled={disabledRedo} onClick={onRedoClick} icon={toolbarIcons.redo} />
            </Fragment>
        );
    },

    // `wsProps` has no Backbone precedent at all -- confirmed by reading the full Backbone
    // Toolbar.js: it disabled 'add'/'edit' identically from one `islocked` value with no
    // worksheet-protection concept. wsProps.Objects is a React-era addition, but it's real and
    // load-bearing elsewhere in this exact app: EditingPage.jsx:98,105,119 gate *editing* an
    // already-selected object on `wsProps.Objects && store.isLockedShape` (both must be true --
    // protection alone doesn't block editing an unlocked object), while AddingPage.jsx:80 and
    // AddOther.jsx:31 gate *inserting a new* object on `wsProps.Objects` alone (there's no specific
    // object yet to check the lock state of). 'edit' and 'add' therefore need genuinely different
    // disabled logic, not the one shared flag this used to have.
    getEditOptions({disabled, wsProps, focusOn, isShapeLocked, onEditClick, onAddClick}) {
        const { isEditDisabled, isAddDisabled } = computeToolbarEditAddDisabled({disabled, wsProps, focusOn, isShapeLocked});
        return (
            <Fragment>
                <ToolbarIconLink id="toolbar-edit" disabled={isEditDisabled} onClick={onEditClick} icon={toolbarIcons.edit} />
                <ToolbarIconLink id="toolbar-add" disabled={isAddDisabled} onClick={onAddClick} icon={toolbarIcons.add} />
            </Fragment>
        );
    }
};

export { isObjectSelectionType, getCellSelectionTags, computeToolbarEditAddDisabled };

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/spreadsheeteditor/mobile/app/controller/edit/EditCell.js
// (setApi / onApiSelectionChanged / onApiEditorSelectionChanged), translated to drive the
// already-existing modern store actions: store/cellSettings.js initCellSettings/initFontSettings
// and store/focusObjects.js resetCellInfo/setIsLocked (both actions have no other caller among
// the enumerated files — built anticipating this wiring). The Backbone `_isEdit` guard is
// reproduced via storeAppOptions.isEdit, read fresh on each callback fire. Also builds `intf` and
// wires asc_onFocusObject/changeFocus, and the cell/hyperlink tagging in getSelections's backing
// state -- ported from EditContainer.js's onApiSelectionChanged else-branch (see comment above
// isObjectSelectionType for the one inferred piece, asc_onFocusObject's reliability). Destructures
// the three stores it needs out of `props` up front so the long-lived callback closures below don't
// pin the entire (much larger) injected props tree in memory.
export function initCellInfo(props) {
    const { storeAppOptions, storeCellSettings, storeFocusObjects } = props;
    const api = Common.EditorApi.get();
    let cellSelectionTags = [];

    storeFocusObjects.intf = {
        getSelections: () => cellSelectionTags,
        // Each Image-type matcher below binds get_ObjectValue() to a local once and guards it --
        // matching presentationeditor's isType() defensiveness for the same asc_onFocusObject
        // contract, rather than assuming it's always truthy (also drops the redundant repeat calls
        // the un-guarded version had).
        getShapeObject: () => getTopFocusObject(storeFocusObjects._focusObjects, o => {
            const value = o.get_ObjectValue();
            return o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Image && !!value && value.get_ShapeProperties();
        }),
        getImageObject: () => getTopFocusObject(storeFocusObjects._focusObjects, o => {
            const value = o.get_ObjectValue();
            return o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Image && !!value &&
                !value.get_ChartProperties() && !value.get_ShapeProperties();
        }),
        getChartObject: () => getTopFocusObject(storeFocusObjects._focusObjects, o => {
            const value = o.get_ObjectValue();
            return o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Image && !!value && value.get_ChartProperties();
        }),
        getParagraphObject: () => getTopFocusObject(storeFocusObjects._focusObjects, o =>
            o.get_ObjectType() === Asc.c_oAscTypeSelectElement.Paragraph),
    };

    api.asc_registerCallback('asc_onFocusObject', (objects) => {
        const list = Array.from(objects || []);
        storeFocusObjects.resetFocusObjects(list);
        storeFocusObjects.changeFocus(list.length > 0);
    });

    api.asc_registerCallback('asc_onSelectionChanged', (cellInfo) => {
        if (!storeAppOptions.isEdit) return;

        storeCellSettings.initCellSettings(cellInfo);
        storeFocusObjects.resetCellInfo(cellInfo);
        storeFocusObjects.setIsLocked(cellInfo);

        // ported from EditContainer.js's onApiSelectionChanged: `else { _settings.push('cell'); if
        // (cellInfo.asc_getHyperlink()) _settings.push('hyperlink'); }` -- the object-type branches
        // (chart/shape/image/text) are covered by asc_onFocusObject/store.objects above instead.
        if (!isObjectSelectionType(cellInfo.asc_getSelectionType())) {
            cellSelectionTags = getCellSelectionTags(cellInfo);
            storeFocusObjects.changeFocus(false);
        }
    });

    api.asc_registerCallback('asc_onEditorSelectionChanged', (fontObj) => {
        if (!storeAppOptions.isEdit) return;

        storeCellSettings.initFontSettings(fontObj);
    });
}

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/spreadsheeteditor/mobile/app/controller/edit/EditCell.js
// (setApi / onApiInitEditorStyles), translated to drive store/cellSettings.js initCellStyles.
// The Backbone view-rendering step (this.getView('EditCell').renderStyles(styles)) is dropped
// since React now renders from the cellStyles observable directly.
export function initEditorStyles(storeCellSettings) {
    Common.EditorApi.get().asc_registerCallback('asc_onInitEditorStyles', (styles) => {
        // array-like SDK collection, not a real Array -- see initFonts below.
        storeCellSettings.initCellStyles(Array.from(styles || []));
    });
}

// ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/spreadsheeteditor/mobile/app/controller/edit/EditCell.js
// (setApi / onApiLoadFonts), field shape cross-checked against the desktop AGPL
// apps/common/main/lib/controller/Fonts.js:101-121 onApiLoadFonts (same asc_onInitEditorFonts
// callback, same {id,name,imgidx,type} shape), confirming this is a stable SDK-level contract
// rather than a mobile-only convention. Raw fonts/select are passed straight through since
// store/cellSettings.js initEditorFonts already re-derives the array shape itself.
// Narrows the closure to just the one store it needs, matching initEditorStyles's convention,
// rather than pinning the whole `props` tree for the life of this callback.
export function initFonts(props) {
    const { storeCellSettings } = props;
    Common.EditorApi.get().asc_registerCallback('asc_onInitEditorFonts', (fonts, select) => {
        // SDK callback collections are array-like, not real JS Arrays (no for-of/map/find) --
        // confirmed via a runtime "e is not iterable" crash in documenteditor's identical
        // asc_onInitTableTemplates wiring, and cellSettings.js's own initEditorFonts does
        // `for (let font of fonts)` internally, so this must be converted before the call.
        storeCellSettings.initEditorFonts(Array.from(fonts || []), select);
    });
}
