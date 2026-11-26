/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// An edit sub-page can stay open after the selection moves off the object it
// edits, by tapping a cell or by undo. Each page names the object it needs,
// and the edit panel closes once that object is gone.

// A shape page needs a selected shape that is not a chart's own shape: while a
// chart is selected the edit panel offers the chart editor, not the shape one.
export const hasShape = focus => !!focus.shapeObject && !focus.chartObject && focus.focusOn !== 'cell';

// A chart page needs a selected chart.
export const hasChart = focus => !!focus.chartObject && focus.focusOn !== 'cell';

// The chart fill page also reads the chart's shape properties.
export const hasChartShape = focus => hasChart(focus) && !!focus.shapeObject;

// The edit panel to close when a page has lost its object: the sheet on
// phones, the popover elsewhere. Null while the object is there.
export const panelToClose = (hasTarget, isPhone) => {
    if (hasTarget) return null;
    return isPhone ? 'sheet' : 'popover';
};
