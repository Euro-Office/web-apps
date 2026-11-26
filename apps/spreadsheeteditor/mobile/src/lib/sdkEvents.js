/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { bindEditorFonts } from '../../../../common/mobile/lib/editorFonts.js';
import { createCellInfoIntf, isObj } from './selectionRules.js';

export { initThemeColors } from '../../../../common/mobile/lib/themeColors.js';

export function initEditorStyles(storeCellSettings) {
    const api = Common.EditorApi.get();
    // CStyleImage exports only its getters, so map to the plain fields the views read.
    api.asc_registerCallback('asc_onInitEditorStyles', styles => storeCellSettings.initCellStyles(
        styles.map(style => ({ name: style.asc_getName(), image: style.asc_getImage() })),
    ));
}

// The cell font page reads the font list from the cell store but its thumbnails
// from the text store, so both need the list.
export function initFonts(props) {
    bindEditorFonts([props.storeCellSettings, props.storeTextSettings]);
}

// runInAction: MobX's, passed in so this module stays loadable without the bundle.
// Runs before permissions are known, so isEdit is read when each event fires.
export function initCellInfo(props, runInAction) {
    const { users, storeAppOptions, storeFocusObjects, storeCellSettings, storeTextSettings } = props;
    storeFocusObjects.intf = createCellInfoIntf(storeFocusObjects);
    const api = Common.EditorApi.get();

    api.asc_registerCallback('asc_onSelectionChanged', info => {
        if (users.isDisconnected) return;
        // One action, so no reader sees the new focus with the old objects or the reverse.
        runInAction(() => {
            storeFocusObjects.resetFocusObjects(api.asc_getGraphicObjectProps() || []);
            storeFocusObjects.resetCellInfo(info);
            storeFocusObjects.changeFocus(isObj(info.asc_getSelectionType()));
            storeFocusObjects.setIsLocked(info);
            if (storeAppOptions.isEdit) {
                storeCellSettings.initCellSettings(info);
                storeTextSettings.initTextSettings(info);
            }
        });
    });

    api.asc_registerCallback('asc_onEditorSelectionChanged', xfs => {
        if (!storeAppOptions.isEdit) return;
        storeCellSettings.initFontSettings(xfs);
        storeTextSettings.initFontSettings(xfs);
    });
}
