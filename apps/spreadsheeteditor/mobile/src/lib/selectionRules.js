/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { getTopFocusObject } from '../../../../common/mobile/lib/getTopFocusObject.js';

// Selections that put the focus on a drawing rather than on cells.
export function isObj(selectionType) {
    const type = Asc.c_oAscSelectionType;
    return selectionType === type.RangeImage || selectionType === type.RangeShape ||
        selectionType === type.RangeChart || selectionType === type.RangeShapeText ||
        selectionType === type.RangeChartText || selectionType === type.RangeSlicer;
}

// Kind of the selected drawing, from the graphic objects of a drawing selection.
function classifyDrawing(focusObjects) {
    const kind = { chart: false, shape: false, image: false };
    for (const object of focusObjects) {
        if (object.get_ObjectType() !== Asc.c_oAscTypeSelectElement.Image) continue;
        const value = object.get_ObjectValue();
        const shapeProperties = value.get_ShapeProperties();
        if (shapeProperties) {
            kind[shapeProperties.asc_getFromChart() ? 'chart' : 'shape'] = true;
        } else if (value.get_ChartProperties()) {
            kind.chart = true;
        } else {
            kind.image = true;
        }
    }
    return kind;
}

// Edit-panel tags for the selection. Never null: AddOther and EditShape read it unguarded.
export function getSelections(cellInfo, focusObjects) {
    if (!cellInfo) return [];
    const type = Asc.c_oAscSelectionType;
    const selectionType = cellInfo.asc_getSelectionType();
    const isDrawing = selectionType === type.RangeImage || selectionType === type.RangeShape ||
        selectionType === type.RangeChart;
    const kind = isDrawing ? classifyDrawing(focusObjects) : {};

    if (kind.chart || selectionType === type.RangeChartText) {
        return selectionType === type.RangeChartText ? ['chart', 'text'] : ['chart'];
    }
    if (kind.shape || selectionType === type.RangeShapeText) {
        return selectionType === type.RangeShapeText ? ['shape', 'text'] : ['shape'];
    }
    if (kind.image) return ['image'];
    return cellInfo.asc_getHyperlink() ? ['cell', 'hyperlink'] : ['cell'];
}

// storeFocusObjects.intf. Each getter reads the store's observables when called,
// so the store's computeds track them through it.
export function createCellInfoIntf(store) {
    const type = () => Asc.c_oAscTypeSelectElement;
    const drawing = predicate => getTopFocusObject(store._focusObjects, type().Image, predicate);
    return {
        getSelections: () => getSelections(store._cellInfo, store._focusObjects),
        // Includes chart-backed shapes: the chart panels read shapeObject.get_ShapeProperties().
        getShapeObject: () => drawing(value => !!value.get_ShapeProperties()),
        getChartObject: () => drawing(value => !!value.get_ChartProperties()),
        getImageObject: () => drawing(),
        getParagraphObject: () => getTopFocusObject(store._focusObjects, type().Paragraph),
    };
}

// Toolbar Edit: off for a protection-locked drawing whose text is locked too
// (the text editor stays reachable otherwise). wsProps is undefined until the
// sheet's protection is known, which reads as unprotected.
export function isEditDisabled({ disabled, wsProps, focusOn, isShapeLocked, isTextLocked }) {
    return !!(disabled || (focusOn === 'obj' && wsProps?.Objects && isShapeLocked && isTextLocked));
}

// Toolbar Add: off when protection removes every tab of the add panel.
export function isAddDisabled({ disabled, wsProps }) {
    return !!(disabled || (wsProps?.Objects && wsProps?.InsertHyperlinks && wsProps?.Sort));
}
