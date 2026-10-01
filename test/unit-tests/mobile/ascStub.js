/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Minimal SDK stand-ins for plain-Node tests of the mobile editor modules.
// Objects carry only the methods the real SDK exposes, so a misspelt getter
// throws here instead of passing silently.

// An asc_CSelectedObject, as delivered by asc_onFocusObject.
export function selectedObject(type, value) {
    return {
        get_ObjectType: () => type,
        get_ObjectValue: () => value,
    };
}

// An editor API that records asc_registerCallback calls and can fire them.
export function createApi() {
    const callbacks = new Map();
    return {
        asc_registerCallback(name, handler) {
            if (!callbacks.has(name)) callbacks.set(name, []);
            callbacks.get(name).push(handler);
        },
        callbacks(name) {
            return callbacks.get(name) ?? [];
        },
        emit(name, ...args) {
            for (const handler of this.callbacks(name)) handler(...args);
        },
    };
}

// Installs the global `Common` the mobile modules read; returns an uninstaller.
export function installCommon({ api, themeColor }) {
    globalThis.Common = {
        EditorApi: { get: () => api },
        Utils: { ThemeColor: themeColor },
    };
    return () => { delete globalThis.Common; };
}

// sdkjs enum values (common/commonDefines.js), for installAsc().
export const selectElementTypes = {
    Paragraph: 0, Table: 1, Image: 2, Header: 3, Hyperlink: 4, SpellCheck: 5,
    Shape: 6, Slide: 7, Chart: 8, Math: 9, MailMerge: 10, ContentControl: 11,
};
export const chartTypes = {
    barNormal: 0, comboCustom: 38, comboBarLine: 39, comboBarLineSecondary: 40, comboAreaBar: 41,
};

// Installs the global `Asc` with the given enums, e.g.
// { c_oAscTypeSelectElement: selectElementTypes }; returns an uninstaller.
export function installAsc(enums) {
    globalThis.Asc = enums;
    return () => { delete globalThis.Asc; };
}
