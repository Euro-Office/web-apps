/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Value of the last focus object of the given type (and matching predicate, if
// given), or undefined. objects are asc_CSelectedObject-like items.
export function getTopFocusObject(objects, type, predicate) {
    for (let i = objects.length - 1; i >= 0; i--) {
        if (objects[i].get_ObjectType() !== type) continue;
        const value = objects[i].get_ObjectValue();
        if (!predicate || predicate(value)) return value;
    }
    return undefined;
}
