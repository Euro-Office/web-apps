import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../../../common/mobile/lib/controller/collaboration/Comments', () => ({
  CommentsController: () => null,
  ViewCommentsController: () => null,
}));

import { installMockApi, resetMockApi } from '../../../../../common/mobile/lib/sdk/testHelpers';
import { initFonts, initEditorStyles, initFocusObjects, initThemeColors } from '../editor';

let api;

beforeEach(() => {
  api = installMockApi();
});

afterEach(() => {
  resetMockApi();
});

describe('initThemeColors', () => {
  it('registers asc_onSendThemeColors callback', () => {
    initThemeColors();
    expect(api.asc_registerCallback).toHaveBeenCalledWith(
      'asc_onSendThemeColors',
      expect.any(Function),
    );
  });

  it('callback calls Common.Utils.ThemeColor.setColors', () => {
    const setColors = vi.fn();
    Common.Utils.ThemeColor.setColors = setColors;

    initThemeColors();
    const callback = api.asc_registerCallback.mock.calls.find(
      (c) => c[0] === 'asc_onSendThemeColors',
    )[1];

    callback(['colors'], ['standards']);
    expect(setColors).toHaveBeenCalledWith(['colors'], ['standards']);
  });
});

describe('initFonts', () => {
  it('registers asc_onInitEditorFonts callback', () => {
    const store = { initEditorFonts: vi.fn() };
    initFonts(store);

    expect(api.asc_registerCallback).toHaveBeenCalledWith(
      'asc_onInitEditorFonts',
      expect.any(Function),
    );
  });

  it('callback calls store.initEditorFonts with fonts and select', () => {
    const store = { initEditorFonts: vi.fn() };
    initFonts(store);

    const callback = api.asc_registerCallback.mock.calls.find(
      (c) => c[0] === 'asc_onInitEditorFonts',
    )[1];

    callback(['Arial', 'Times'], 'Arial');
    expect(store.initEditorFonts).toHaveBeenCalledWith(['Arial', 'Times'], 'Arial');
  });
});

describe('initEditorStyles', () => {
  it('sets paragraph style sizes', () => {
    const store = { initEditorStyles: vi.fn(), changeParaStyleName: vi.fn() };
    initEditorStyles(store);

    expect(api.asc_setParagraphStylesSizes).toHaveBeenCalledWith(330, 38);
  });

  it('registers asc_onInitEditorStyles callback', () => {
    const store = { initEditorStyles: vi.fn(), changeParaStyleName: vi.fn() };
    initEditorStyles(store);

    expect(api.asc_registerCallback).toHaveBeenCalledWith(
      'asc_onInitEditorStyles',
      expect.any(Function),
    );
  });

  it('registers asc_onParaStyleName callback', () => {
    const store = { initEditorStyles: vi.fn(), changeParaStyleName: vi.fn() };
    initEditorStyles(store);

    expect(api.asc_registerCallback).toHaveBeenCalledWith(
      'asc_onParaStyleName',
      expect.any(Function),
    );
  });

  it('asc_onInitEditorStyles callback wires to store', () => {
    const store = { initEditorStyles: vi.fn(), changeParaStyleName: vi.fn() };
    initEditorStyles(store);

    const callback = api.asc_registerCallback.mock.calls.find(
      (c) => c[0] === 'asc_onInitEditorStyles',
    )[1];

    callback(['style1', 'style2']);
    expect(store.initEditorStyles).toHaveBeenCalledWith(['style1', 'style2']);
  });

  it('asc_onParaStyleName callback wires to store', () => {
    const store = { initEditorStyles: vi.fn(), changeParaStyleName: vi.fn() };
    initEditorStyles(store);

    const callback = api.asc_registerCallback.mock.calls.find(
      (c) => c[0] === 'asc_onParaStyleName',
    )[1];

    callback('Heading 1');
    expect(store.changeParaStyleName).toHaveBeenCalledWith('Heading 1');
  });
});

describe('initFocusObjects', () => {
  it('registers asc_onFocusObject callback', () => {
    const store = { _focusObjects: [], intf: {} };
    initFocusObjects(store);

    expect(api.asc_registerCallback).toHaveBeenCalledWith(
      'asc_onFocusObject',
      expect.any(Function),
    );
  });

  it('callback calls store.resetFocusObjects', () => {
    const store = { _focusObjects: [], intf: {}, resetFocusObjects: vi.fn() };
    initFocusObjects(store);

    const callback = api.asc_registerCallback.mock.calls.find(
      (c) => c[0] === 'asc_onFocusObject',
    )[1];

    const objects = [{ type: 'test' }];
    callback(objects);
    expect(store.resetFocusObjects).toHaveBeenCalledWith(objects);
  });

  it('builds standard getters on store.intf', () => {
    const store = { _focusObjects: [], intf: {} };
    initFocusObjects(store);

    expect(typeof store.intf.getHeaderObject).toBe('function');
    expect(typeof store.intf.getParagraphObject).toBe('function');
    expect(typeof store.intf.getTableObject).toBe('function');
    expect(typeof store.intf.getLinkObject).toBe('function');
    expect(typeof store.intf.getShapeObject).toBe('function');
    expect(typeof store.intf.getImageObject).toBe('function');
    expect(typeof store.intf.getChartObject).toBe('function');
    expect(typeof store.intf.filterFocusObjects).toBe('function');
  });

  it('filterFocusObjects returns correct types for mixed stack', () => {
    const store = { _focusObjects: [], intf: {} };
    initFocusObjects(store);

    store._focusObjects = [
      { get_ObjectType: () => Asc.c_oAscTypeSelectElement.Paragraph, get_ObjectValue: () => ({}) },
      { get_ObjectType: () => Asc.c_oAscTypeSelectElement.Table, get_ObjectValue: () => ({}) },
      { get_ObjectType: () => Asc.c_oAscTypeSelectElement.Hyperlink, get_ObjectValue: () => ({}) },
    ];

    const result = store.intf.filterFocusObjects();
    expect(result).toContain('text');
    expect(result).toContain('paragraph');
    expect(result).toContain('table');
    expect(result).toContain('hyperlink');
  });

  it('filterFocusObjects deduplicates results', () => {
    const store = { _focusObjects: [], intf: {} };
    initFocusObjects(store);

    store._focusObjects = [
      { get_ObjectType: () => Asc.c_oAscTypeSelectElement.Paragraph, get_ObjectValue: () => ({}) },
      { get_ObjectType: () => Asc.c_oAscTypeSelectElement.Paragraph, get_ObjectValue: () => ({}) },
    ];

    const result = store.intf.filterFocusObjects();
    // Two paragraphs should still only produce one 'text' and one 'paragraph'
    expect(result.filter((x) => x === 'text')).toHaveLength(1);
    expect(result.filter((x) => x === 'paragraph')).toHaveLength(1);
  });

  it('filterFocusObjects identifies chart and removes shape', () => {
    const store = { _focusObjects: [], intf: {} };
    initFocusObjects(store);

    store._focusObjects = [
      {
        get_ObjectType: () => Asc.c_oAscTypeSelectElement.Image,
        get_ObjectValue: () => ({ get_ShapeProperties: () => ({}), get_ChartProperties: () => null }),
      },
      {
        get_ObjectType: () => Asc.c_oAscTypeSelectElement.Image,
        get_ObjectValue: () => ({ get_ShapeProperties: () => null, get_ChartProperties: () => ({}) }),
      },
    ];

    const result = store.intf.filterFocusObjects();
    expect(result).toContain('chart');
    expect(result).not.toContain('shape');
  });
});
