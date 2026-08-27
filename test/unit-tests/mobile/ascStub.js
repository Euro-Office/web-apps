// Minimal stand-in for the ONLYOFFICE SDK's global `Asc` enums, used only by the mobile focus-object
// classification/selection-rule tests. The pure logic under test only ever compares these for
// equality against object-provided values (never against real SDK behavior), so the exact numbers
// don't matter -- only that every member a tested function references exists and is distinct.
// Must be imported (for its side effect of setting `global.Asc`) before any module that reads
// `Asc.*` at its own module-evaluation time (e.g. presentationeditor's focusObjectTags.js builds a
// type-lookup table at the top level, not inside a function).
globalThis.Asc = {
    c_oAscTypeSelectElement: {
        Paragraph: 0,
        Table: 1,
        Image: 2,
        Header: 3,
        Shape: 4,
        Slide: 5,
        Chart: 6,
        Hyperlink: 7,
    },
    c_oAscSelectionType: {
        RangeCells: 100,
        RangeRow: 101,
        RangeCol: 102,
        RangeMax: 103,
        RangeImage: 104,
        RangeShape: 105,
        RangeChart: 106,
        RangeChartText: 107,
        RangeShapeText: 108,
    },
};
