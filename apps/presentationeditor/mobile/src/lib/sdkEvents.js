/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { bindEditorFonts } from '../../../../common/mobile/lib/editorFonts.js';
import { createFocusObjectsIntf } from './focusObjectTags.js';

export { initThemeColors } from '../../../../common/mobile/lib/themeColors.js';

// Row height of the built-in theme thumbnails in resources/img/themes/themes.png.
const THEME_SPRITE_ROW_HEIGHT = 38;

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

// themes: [editorThemes, documentThemes]. Built-in themes are drawn from a
// sprite, document themes from their own thumbnail.
const toThemeItems = themes => [
    ...(themes[0] ?? []).map((theme, index) => ({ themeId: theme.get_Index(), offsety: index * THEME_SPRITE_ROW_HEIGHT })),
    ...(themes[1] ?? []).map(theme => ({ imageUrl: theme.get_Image(), themeId: theme.get_Index(), offsety: 0 })),
];

// The only init member that receives storeSlideSettings, so it also owns layouts
// and the theme index.
export function initEditorStyles(storeSlideSettings) {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onInitEditorStyles', themes => storeSlideSettings.addArrayThemes(toThemeItems(themes)));
    api.asc_registerCallback('asc_onUpdateLayout', layouts => storeSlideSettings.addArrayLayouts(layouts));
    api.asc_registerCallback('asc_onUpdateThemeIndex', index => storeSlideSettings.changeSlideThemeIndex(index));
}

export function initFocusObjects(storeFocusObjects) {
    storeFocusObjects.intf = createFocusObjectsIntf(storeFocusObjects);
    const api = Common.EditorApi.get();
    // The SDK reuses and splices the same array on every selection; keep a copy.
    api.asc_registerCallback('asc_onFocusObject', objects => storeFocusObjects.resetFocusObjects(Array.from(objects)));
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
    // Fires before this update's focus refresh, so chartObject may be stale or
    // absent; the chart panel fetches its own previews when it opens.
    api.asc_registerCallback('asc_onUpdateChartStyles', () => {
        const chart = storeFocusObjects.chartObject;
        if (!chart) return;
        const type = chart.getType();
        // Combo charts have no style previews; the chart panel clears them.
        if (isComboChart(type)) return;
        storeChartSettings.updateChartStyles(api.asc_getChartPreviews(type));
    });
}
