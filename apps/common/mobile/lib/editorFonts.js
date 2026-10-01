/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// stores: every store whose views read the font list (SSE has two).
export function bindEditorFonts(stores) {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onInitEditorFonts', (fonts, select) => {
        for (const store of stores) {
            store.initEditorFonts(fonts, select);
        }
    });
}
