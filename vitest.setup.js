// Minimal stubs for SDK globals that mobile code accesses without imports.
// Values match the real SDK — extend as tests require more constants.

globalThis.Asc = {
  c_oAscTypeSelectElement: {
    Paragraph: 0,
    Table: 1,
    Image: 2,
    Header: 3,
    Hyperlink: 4,
    SpellCheck: 5,
    Slide: 6,
    Shape: 7,
    Chart: 8,
  },
  c_oAscEDocProtect: {
    TrackedChanges: 0,
  },
  c_oAscVertDrawingText: {
    normal: 0,
    vert: 1,
    vert270: 3,
  },
  c_oAscCellTextDirection: {
    LRTB: 0,
    TBRL: 1,
    BTLR: 2,
  },
  // Spreadsheet selection types
  c_oAscSelectionType: {
    RangeCells: 1,
    RangeRow: 2,
    RangeCol: 3,
    RangeMax: 4,
    RangeImage: 5,
    RangeShape: 6,
    RangeChart: 7,
    RangeChartText: 8,
    RangeShapeText: 9,
  },
  // Spreadsheet cell alignment
  c_oAscVAlign: {
    Top: 0,
    Center: 1,
    Bottom: 2,
  },
  // Color types
  c_oAscColor: {
    COLOR_TYPE_SCHEME: 1,
    COLOR_TYPE_SRGB: 2,
  },
  // Fill types
  c_oAscFill: {
    FILL_TYPE_SOLID: 1,
  },
  // Stroke types
  c_oAscStrokeType: {
    STROKE_COLOR: 0,
  },
  // Presentation baseline alignment
  vertalign_SuperScript: 1,
  vertalign_SubScript: 2,
  // Font thumbnail height
  FONT_THUMBNAIL_HEIGHT: 28,
};

// AscCommon alignment constants (used by spreadsheet cell settings)
globalThis.AscCommon = {
  align_Left: 0,
  align_Center: 1,
  align_Right: 2,
  align_Justify: 3,
};

const noop = () => {};
const noopEmitter = { on: noop, off: noop, trigger: noop };

globalThis.Common = {
  EditorApi: {
    get: () => null,
  },
  Gateway: { on: noop, off: noop, requestClose: noop, requestEditRights: noop, requestRename: noop, requestHistoryClose: noop, switchEditorType: noop },
  Notifications: noopEmitter,
  Utils: {
    ThemeColor: {
      setColors: noop,
      getRgbColor: (c) => c,
      getHexColor: (r, g, b) => {
        const hex = (v) => v.toString(16).padStart(2, '0');
        return hex(r) + hex(g) + hex(b);
      },
    },
    applicationPixelRatio: () => 1,
    Metric: {
      getCurrentMetric: () => 0,
      c_MetricUnits: { pt: 0 },
      fnRecalcFromMM: (v) => v,
      fnRecalcToMM: (v) => v,
    },
  },
};

globalThis.window.editorType = 'word';

// Dom7 selector stub — Framework7 uses $$ as a jQuery-like selector
globalThis.$$ = (selector) => {
  const els = document.querySelectorAll(selector);
  const arr = Array.from(els);
  arr.remove = () => arr.forEach((el) => el.remove());
  return arr;
};

// matchMedia stub — used by Toolbar view for responsive checks
if (!globalThis.window.matchMedia) {
  globalThis.window.matchMedia = () => ({ matches: true, addListener: () => {}, removeListener: () => {} });
}
