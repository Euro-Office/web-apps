import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installMockApi, resetMockApi } from '@common/lib/sdk/testHelpers';
import { storeFocusObjects } from '../../store/focusObjects';

vi.mock('framework7-react', () => ({
  Link: 'a',
}));
vi.mock('../../../../../common/mobile/lib/controller/collaboration/Comments', () => ({
  CommentsController: () => null,
  ViewCommentsController: () => null,
}));

import { initFocusObjects } from '../editor';

const makeObj = (type, value) => ({
  get_ObjectType: () => type,
  get_ObjectValue: () => value,
});

describe('initFocusObjects (presentation)', () => {
  let api;
  let store;

  beforeEach(() => {
    api = installMockApi();
    store = new storeFocusObjects();
    initFocusObjects(store);
  });

  afterEach(() => resetMockApi());

  it('registers asc_onFocusObject callback', () => {
    expect(api.asc_registerCallback).toHaveBeenCalledWith('asc_onFocusObject', expect.any(Function));
  });

  it('sets up intf with filterFocusObjects', () => {
    expect(store.intf).toBeDefined();
    expect(typeof store.intf.filterFocusObjects).toBe('function');
  });

  describe('filterFocusObjects', () => {
    it('returns ["text", "shape"] for unlocked shape with paragraph', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false }),
        makeObj(Asc.c_oAscTypeSelectElement.Shape, { get_FromChart: () => false, get_Locked: () => false }),
      ]);
      expect(store.intf.filterFocusObjects()).toEqual(['text', 'shape']);
    });

    it('returns ["slide"] for unlocked slide only', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Slide, {
          get_LockLayout: () => false,
          get_LockBackground: () => false,
          get_LockTransition: () => false,
          get_LockTiming: () => false,
        }),
      ]);
      expect(store.intf.filterFocusObjects()).toEqual(['slide']);
    });

    it('excludes slide when any slide lock is active', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Slide, {
          get_LockLayout: () => true,
          get_LockBackground: () => false,
          get_LockTransition: () => false,
          get_LockTiming: () => false,
        }),
      ]);
      expect(store.intf.filterFocusObjects()).toEqual([]);
    });

    it('returns ["image"] for unlocked image (no text)', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Image, { get_Locked: () => false }),
      ]);
      // No paragraph => no hasUnlockedParagraph, but image present => no 'text'
      expect(store.intf.filterFocusObjects()).toEqual(['image']);
    });

    it('returns ["text", "table"] for unlocked table with paragraph', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false }),
        makeObj(Asc.c_oAscTypeSelectElement.Table, { get_Locked: () => false }),
      ]);
      expect(store.intf.filterFocusObjects()).toEqual(['text', 'table']);
    });

    it('excludes locked objects', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Shape, { get_FromChart: () => false, get_Locked: () => true }),
        makeObj(Asc.c_oAscTypeSelectElement.Paragraph, { get_Locked: () => true }),
      ]);
      expect(store.intf.filterFocusObjects()).toEqual([]);
    });

    it('includes hyperlink only when text is present', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false }),
        makeObj(Asc.c_oAscTypeSelectElement.Shape, { get_FromChart: () => false, get_Locked: () => false }),
        makeObj(Asc.c_oAscTypeSelectElement.Hyperlink, {}),
      ]);
      const result = store.intf.filterFocusObjects();
      expect(result).toContain('hyperlink');
      expect(result).toContain('text');
    });

    it('removes hyperlink when no text', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Image, { get_Locked: () => false }),
        makeObj(Asc.c_oAscTypeSelectElement.Hyperlink, {}),
      ]);
      const result = store.intf.filterFocusObjects();
      expect(result).not.toContain('hyperlink');
    });

    it('removes shape when chart is present', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Chart, { get_Locked: () => false }),
        makeObj(Asc.c_oAscTypeSelectElement.Shape, { get_FromChart: () => false, get_Locked: () => false }),
        makeObj(Asc.c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false }),
      ]);
      const result = store.intf.filterFocusObjects();
      expect(result).toContain('chart');
      expect(result).not.toContain('shape');
    });

    it('excludes shape from chart', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Shape, { get_FromChart: () => true, get_Locked: () => false }),
      ]);
      expect(store.intf.filterFocusObjects()).toEqual([]);
    });

    it('deduplicates types', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false }),
        makeObj(Asc.c_oAscTypeSelectElement.Shape, { get_FromChart: () => false, get_Locked: () => false }),
        makeObj(Asc.c_oAscTypeSelectElement.Shape, { get_FromChart: () => false, get_Locked: () => false }),
      ]);
      const result = store.intf.filterFocusObjects();
      expect(result.filter(x => x === 'shape')).toHaveLength(1);
    });
  });
});
