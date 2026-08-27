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
import { filterFocusObjects, isType, TOP_OBJECT_TYPES } from './focusObjectTags';

// Sources per export below are either the pre-removal Backbone mobile controllers
// (ONLYOFFICE/web-apps@v5.4.99.1767) or an existing, already-shipped AGPL controller in this repo.
// ContextMenu is deliberately not implemented here.

export { initThemeColors };

export function getToolbarOptions({ disabledEdit, disabledAdd, onEditClick, onAddClick }) {
    // ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/presentationeditor/mobile/app/controller/Toolbar.js
    // (#toolbar-edit/#toolbar-add elements; disabled-toggling in onApiFocusObject, activateControls/
    // activateViewControls/deactivateEditControls) -- verified directly against that tag's source.
    // The old Backbone buttons used CSS icon-font classes; there is no 1:1 icon asset to carry
    // over, so this reuses the existing common icon-edit/icon-plus SVG symbols already shipped
    // for other mobile toolbars in this repo.
    return (
        <Fragment>
            <ToolbarIconLink disabled={disabledEdit} onClick={onEditClick} icon={toolbarIcons.edit} />
            <ToolbarIconLink disabled={disabledAdd} onClick={onAddClick} icon={toolbarIcons.add} />
        </Fragment>
    );
}

export function getUndoRedo({ disabledUndo, disabledRedo, onUndoClick, onRedoClick }) {
    // ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/presentationeditor/mobile/app/controller/Toolbar.js
    // (#toolbar-undo/#toolbar-redo; onUndo/onRedo call api.Undo()/api.Redo(); onApiCanRevert
    // toggles the disabled class) -- verified directly against that tag's source. The current
    // call site already pre-binds onUndoClick/onRedoClick to the store-backed handlers and
    // pre-computes disabledUndo/disabledRedo, so this hook is pure presentation.
    return (
        <Fragment>
            <ToolbarIconLink disabled={disabledUndo} onClick={onUndoClick} icon={toolbarIcons.undo} />
            <ToolbarIconLink disabled={disabledRedo} onClick={onRedoClick} icon={toolbarIcons.redo} />
        </Fragment>
    );
}

export function initFonts(store) {
    // ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/presentationeditor/mobile/app/controller/edit/EditText.js
    // (onApiLoadFonts(fonts, select), registered on asc_onInitEditorFonts) -- verified directly
    // against that tag's source. Corroborated by apps/common/main/lib/controller/Fonts.js (this
    // repo, desktop, ungated), which registers the same event with the same handler signature.
    // store.initEditorFonts(fonts, select) (confirmed by reading
    // apps/presentationeditor/mobile/src/store/textSettings.js) already builds the
    // {id, name, imgidx, type} array itself from the raw font API objects, so this hook only
    // needs to forward the callback's raw arguments.
    Common.EditorApi.get().asc_registerCallback('asc_onInitEditorFonts', (fonts, select) => {
        // SDK callback collections are array-like, not real JS Arrays (no for-of/map/find) --
        // confirmed via a runtime "e is not iterable" crash in documenteditor's identical
        // asc_onInitTableTemplates wiring; normalizing defensively wherever a raw SDK
        // collection is consumed.
        store.initEditorFonts(Array.from(fonts || []), select);
    });
}

export function initEditorStyles(store) {
    // ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/presentationeditor/mobile/app/controller/edit/EditSlide.js
    // (onApiInitEditorStyles(themes), registered on asc_onInitEditorStyles) -- verified directly
    // against that tag's source: no `offsety` field. It concatenates themes[0] (default themes) and themes[1] (doc themes) and
    // maps every entry uniformly to {imageUrl: theme.get_Image(), themeId: theme.get_Index()}.
    // apps/presentationeditor/mobile/src/store/slideSettings.js (read directly) exposes exactly
    // matching shape: arrayThemes (observable) / addArrayThemes(array) (action).
    Common.EditorApi.get().asc_registerCallback('asc_onInitEditorStyles', (themes) => {
        if (!themes) return;
        // array-like SDK collections, not real Arrays -- see initFonts above.
        const defaultThemes = Array.from(themes[0] || []);
        const docThemes = Array.from(themes[1] || []);
        const combined = defaultThemes.concat(docThemes).map((theme) => ({
            imageUrl: theme.get_Image(),
            themeId: theme.get_Index()
        }));
        store.addArrayThemes(combined);
    });

    // TODO: slide *layout* population (store.addArrayLayouts, whose Backbone precedent is
    // AddSlide.js's onUpdateLayout on asc_onUpdateLayout) has no confirmed call site in
    // Main.jsx/Toolbar.jsx and is not one of the required exports here. Not wired here; flagging
    // rather than guessing at a mechanism outside initEditorStyles's own contract.
}

export { filterFocusObjects, isType };

export function initFocusObjects(store) {
    // ported from ONLYOFFICE/web-apps@v5.4.99.1767 -- the identical "get last matching, return
    // get_ObjectValue()" pattern (now the shared getTopFocusObject helper) repeated across, and verified directly
    // against, all six per-object-type mobile controllers' onApiFocusObject handlers:
    // EditText.js:491 (Paragraph), EditSlide.js:370 (Slide), EditTable.js:511 (Table),
    // EditShape.js:379 (Shape), EditImage.js:206 (Image), EditLink.js:320 (Hyperlink),
    // EditChart.js:385 (Chart, plus Shape-with-get_FromChart() for its own border/fill needs).
    // All six register on the same top-level asc_onFocusObject event, each keeping its own
    // scoped "top object of my type" -- exactly what apps/presentationeditor/mobile/src/store/focusObjects.js's
    // per-type computed getters (slideObject/paragraphObject/shapeObject/imageObject/tableObject/
    // chartObject/linkObject, all delegating to `this.intf`) need. `intf` is never assigned inside
    // focusObjects.js itself, so this method is responsible for building it, and for registering
    // the single asc_onFocusObject callback that feeds store._focusObjects via the store's own
    // resetFocusObjects(objects) action (this call site was not found elsewhere in the mobile
    // app -- inferred as the only sensible owner of it).
    store.intf = {
        filterFocusObjects: () => filterFocusObjects(store._focusObjects),
        ...Object.fromEntries(Object.entries(TOP_OBJECT_TYPES).map(([name, type]) =>
            [name, () => getTopFocusObject(store._focusObjects, isType(type))]
        )),
    };

    Common.EditorApi.get().asc_registerCallback('asc_onFocusObject', (objects) => {
        // array-like SDK collection, not a real Array -- see initFonts above.
        store.resetFocusObjects(Array.from(objects || []));
    });
}

export function initTableTemplates(store) {
    // ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/presentationeditor/mobile/app/controller/add/AddTable.js
    // and edit/EditTable.js -- verified directly against that tag's source. Both register
    // onApiInitTemplates(templates) on the *same* asc_onInitTableTemplates event as two separate
    // Backbone controllers, each keeping its own scoped {imageUrl, templateId} list built from
    // template.asc_getImage()/asc_getId(): AddTable.js populates its list once (`_styles.length < 1`
    // guard) and broadcasts it (consumed by the "insert table" style picker); EditTable.js
    // unconditionally rebuilds its list on every callback and pushes it straight into the
    // currently-open edit view. apps/presentationeditor/mobile/src/store/tableSettings.js (read
    // directly) merges both into one store: arrayStylesDefault (the populate-once list) and
    // arrayStyles (the always-refreshed list), both fed by the single setStyles(arrStyles, typeStyles) action.
    Common.EditorApi.get().asc_registerCallback('asc_onInitTableTemplates', (templates) => {
        // Confirmed via runtime testing: this SDK collection is array-like, not a real Array
        // (documenteditor's identical wiring crashed with "e is not iterable" without this).
        const styles = Array.from(templates || []).map((template) => ({
            imageUrl: template.asc_getImage(),
            templateId: template.asc_getId()
        }));

        // AddTable.js semantics: populate the default/insert-table style list once.
        if (store.arrayStylesDefault.length < 1) {
            store.setStyles(styles, 'default');
        }

        // EditTable.js semantics: always refresh the edit-table style list.
        store.setStyles(styles);
    });
}

export function updateChartStyles(storeChartSettings, storeFocusObjects) {
    // ported from ONLYOFFICE/web-apps@v5.4.99.1767, apps/presentationeditor/mobile/app/controller/edit/EditChart.js
    // (onApiUpdateChartStyles, registered on asc_onUpdateChartStyles: `if (this.api && _chartObject)
    // { this._updateChartStyles(this.api.asc_getChartPreviews(_chartObject.getType())); }`) --
    // verified directly against that tag's source. `_chartObject` there is populated by the same
    // controller's own onApiFocusObject; in this rewrite that's storeFocusObjects.chartObject,
    // populated by initFocusObjects's intf.getChartObject() -- which is exactly why the current
    // call site passes storeFocusObjects as a second argument here.
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onUpdateChartStyles', () => {
        const chartObject = storeFocusObjects.chartObject;
        if (chartObject) {
            // array-like SDK collection, not a real Array -- see initFonts above.
            const styles = Array.from(api.asc_getChartPreviews(chartObject.getType()) || []);
            // Confirmed by reading apps/presentationeditor/mobile/src/store/chartSettings.js:28-29 --
            // the real action is updateChartStyles(styles), not setStyles (that was an unverified
            // guess by analogy with storeTableSettings; wrong, and silently swallowed by `?.()`
            // rather than throwing, so chart style updates were a no-op until this was checked).
            storeChartSettings.updateChartStyles(styles);
        }
    });
}

// apps/common/mobile/lib/controller/collaboration/Comments.jsx already fully implements and exports
// AddCommentController/EditCommentController -- complete, working, AGPL, mobx-wired React components.
// NOT a Backbone port -- there is no mobile presentation-editor Backbone precedent for comment
// authoring at all (the pre-removal Main.js and DocumentHolder.js have no add/edit-comment UI
// anywhere in the old context menu). This closes that gap via the shared EditCommentControllers
// wrapper (also used by documenteditor).
export function getEditCommentControllers() {
    return <EditCommentControllers />;
}
