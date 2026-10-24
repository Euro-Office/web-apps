/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { getTopFocusObject } from '../../../../common/mobile/lib/getTopFocusObject.js';

// Word reports every drawing (picture, shape, chart) as Image; the value's
// chart / shape properties tell them apart.
const isChart = value => !!value.get_ChartProperties();
const isShape = value => !!value.get_ShapeProperties();
const isPicture = value => !isChart(value) && !isShape(value);

// Edit-panel tags for the current selection. Never null: EditingPage reads .length.
export function filterFocusObjects(objects) {
    const type = Asc.c_oAscTypeSelectElement;
    const tags = new Set();
    for (const object of objects) {
        switch (object.get_ObjectType()) {
            case type.Paragraph:
                tags.add('text');
                tags.add('paragraph');
                break;
            case type.Table:
                tags.add('table');
                break;
            case type.Image: {
                const value = object.get_ObjectValue();
                tags.add(isChart(value) ? 'chart' : isShape(value) ? 'shape' : 'image');
                break;
            }
            case type.Hyperlink:
                tags.add('hyperlink');
                break;
            case type.Header:
                tags.add('header');
                break;
        }
    }
    if (tags.has('chart')) tags.delete('shape');
    return [...tags];
}

// storeFocusObjects.intf. Each getter reads store._focusObjects when called, so
// the store's computeds track the observable through it.
export function createFocusObjectsIntf(store) {
    const top = (type, predicate) => getTopFocusObject(store._focusObjects, type, predicate);
    const type = () => Asc.c_oAscTypeSelectElement;
    return {
        filterFocusObjects: () => filterFocusObjects(store._focusObjects),
        getParagraphObject: () => top(type().Paragraph),
        getTableObject: () => top(type().Table),
        getImageObject: () => top(type().Image, isPicture),
        // Includes charts: the chart panels read shapeObject.get_ShapeProperties().
        getShapeObject: () => top(type().Image, isShape),
        getChartObject: () => top(type().Image, isChart),
        getHeaderObject: () => top(type().Header),
        getLinkObject: () => top(type().Hyperlink),
    };
}
