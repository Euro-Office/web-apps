/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { getTopFocusObject } from '../../../../common/mobile/lib/getTopFocusObject.js';

const isSlideLocked = slide =>
    slide.get_LockLayout() || slide.get_LockBackground() || slide.get_LockTransition() || slide.get_LockTiming();

// Edit-panel tags for the current selection; locked objects get no panel.
// Never null: EditingPage reads .length.
export function filterFocusObjects(objects) {
    const type = Asc.c_oAscTypeSelectElement;
    const tags = [];
    let hasText = false;
    for (const object of objects) {
        const value = object.get_ObjectValue();
        switch (object.get_ObjectType()) {
            case type.Paragraph:
                if (!value.get_Locked()) hasText = true;
                break;
            case type.Table:
                if (!value.get_Locked()) {
                    tags.push('table');
                    hasText = true;
                }
                break;
            case type.Slide:
                if (!isSlideLocked(value)) tags.push('slide');
                break;
            case type.Image:
                if (!value.get_Locked()) tags.push('image');
                break;
            case type.Chart:
                if (!value.get_Locked()) tags.push('chart');
                break;
            case type.Shape:
                // A chart's own shape entry is covered by the chart panel.
                if (!value.get_FromChart() && !value.get_Locked()) {
                    tags.push('shape');
                    hasText = true;
                }
                break;
            case type.Hyperlink:
                tags.push('hyperlink');
                break;
        }
    }
    if (hasText) tags.unshift('text');
    const result = new Set(tags);
    if (!result.has('text')) result.delete('hyperlink');
    if (result.has('chart')) result.delete('shape');
    return [...result];
}

// storeFocusObjects.intf. Each getter reads store._focusObjects when called, so
// the store's computeds track the observable through it.
export function createFocusObjectsIntf(store) {
    const top = (type, predicate) => getTopFocusObject(store._focusObjects, type, predicate);
    const type = () => Asc.c_oAscTypeSelectElement;
    return {
        filterFocusObjects: () => filterFocusObjects(store._focusObjects),
        getSlideObject: () => top(type().Slide),
        getParagraphObject: () => top(type().Paragraph),
        // With a chart selected, this is the chart's shape properties.
        getShapeObject: () => top(type().Shape),
        getImageObject: () => top(type().Image, value => !!value),
        getTableObject: () => top(type().Table),
        getChartObject: () => top(type().Chart),
        getLinkObject: () => top(type().Hyperlink),
    };
}
