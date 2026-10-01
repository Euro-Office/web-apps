/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// The SDK does not replay asc_onSendThemeColors to late subscribers, so this
// must run synchronously from the editor's init, before the document loads.
export function initThemeColors() {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onSendThemeColors', (colors, standart_colors) => {
        Common.Utils.ThemeColor.setColors(colors, standart_colors);
    });
}
