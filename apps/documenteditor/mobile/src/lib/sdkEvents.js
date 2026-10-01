/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { bindEditorFonts } from '../../../../common/mobile/lib/editorFonts.js';
import { createFocusObjectsIntf } from './focusObjectTags.js';

export { initThemeColors } from '../../../../common/mobile/lib/themeColors.js';

// Size of the paragraph-style thumbnails the style list renders.
const STYLE_THUMBNAIL_WIDTH = 330;
const STYLE_THUMBNAIL_HEIGHT = 38;

export function initFonts(storeTextSettings) {
    bindEditorFonts([storeTextSettings]);
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onFontFamily', font => storeTextSettings.resetFontName(font));
    api.asc_registerCallback('asc_onFontSize', size => storeTextSettings.resetFontSize(size));
    api.asc_registerCallback('asc_onBold', value => storeTextSettings.resetIsBold(value));
    api.asc_registerCallback('asc_onItalic', value => storeTextSettings.resetIsItalic(value));
    api.asc_registerCallback('asc_onUnderline', value => storeTextSettings.resetIsUnderline(value));
    api.asc_registerCallback('asc_onStrikeout', value => storeTextSettings.resetIsStrikeout(value));
}

export function initFocusObjects(storeFocusObjects) {
    storeFocusObjects.intf = createFocusObjectsIntf(storeFocusObjects);
    const api = Common.EditorApi.get();
    // The SDK reuses and splices the same array on every selection; keep a copy.
    api.asc_registerCallback('asc_onFocusObject', objects => storeFocusObjects.resetFocusObjects(Array.from(objects)));
}

export function initEditorStyles(storeParagraphSettings) {
    const api = Common.EditorApi.get();
    // Must precede style generation at document open; the painter copies the size when created.
    api.asc_setParagraphStylesSizes(STYLE_THUMBNAIL_WIDTH, STYLE_THUMBNAIL_HEIGHT);
    api.asc_registerCallback('asc_onInitEditorStyles', styles => storeParagraphSettings.initEditorStyles(styles));
    api.asc_registerCallback('asc_onParaStyleName', name => storeParagraphSettings.changeParaStyleName(name));
}

export function initTableTemplates(storeTableSettings) {
    const api = Common.EditorApi.get();
    // The SDK only regenerates table templates while this callback is registered.
    api.asc_registerCallback('asc_onInitTableTemplates', () => {
        const hadStyles = storeTableSettings.arrayStyles.length > 0;
        storeTableSettings.initTableTemplates();
        // An empty list refetches on its next mount; a fetched one may be on screen.
        if (hadStyles) {
            setTimeout(() => storeTableSettings.setStyles(api.asc_getTableStylesPreviews()), 1);
        }
    });
}

const isComboChart = type => {
    const types = Asc.c_oAscChartTypeSettings;
    return type === types.comboBarLine || type === types.comboBarLineSecondary ||
        type === types.comboAreaBar || type === types.comboCustom;
};

export function updateChartStyles(storeChartSettings, storeFocusObjects) {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onUpdateChartStyles', () => {
        const chartProperties = storeFocusObjects.chartObject?.get_ChartProperties();
        if (!chartProperties) return;
        const type = chartProperties.getType();
        // Combo charts have no style previews; the chart panel clears them too.
        if (isComboChart(type)) {
            storeChartSettings.clearChartStyles();
        } else {
            storeChartSettings.updateChartStyles(api.asc_getChartPreviews(type));
        }
    });
}
