import { describe, it, expect, vi } from 'vitest';

// Stub the patch import — it's unused in the store but triggers framework7 resolution
vi.mock('../../lib/patch', () => ({ default: () => null }));

import { storeFocusObjects } from '../focusObjects';

const makeFocusObject = (type, value) => ({
  get_ObjectType: () => type,
  get_ObjectValue: () => value,
});

const { c_oAscTypeSelectElement } = Asc;

describe('storeFocusObjects', () => {
  describe('resetFocusObjects', () => {
    it('replaces _focusObjects with the given array', () => {
      const store = new storeFocusObjects();
      const objects = [makeFocusObject(c_oAscTypeSelectElement.Paragraph, 'val')];
      store.resetFocusObjects(objects);
      expect(store._focusObjects).toHaveLength(1);
      expect(store._focusObjects[0].get_ObjectType()).toBe(c_oAscTypeSelectElement.Paragraph);
      expect(store._focusObjects[0].get_ObjectValue()).toBe('val');
    });
  });

  describe('headerType', () => {
    it('returns the header type when a Header is in the stack', () => {
      const store = new storeFocusObjects();
      store.resetFocusObjects([
        makeFocusObject(c_oAscTypeSelectElement.Paragraph, {}),
        makeFocusObject(c_oAscTypeSelectElement.Header, { get_Type: () => 42 }),
      ]);
      expect(store.headerType).toBe(42);
    });

    it('returns default _headerType when no Header in the stack', () => {
      const store = new storeFocusObjects();
      store.resetFocusObjects([
        makeFocusObject(c_oAscTypeSelectElement.Paragraph, {}),
      ]);
      expect(store.headerType).toBe(1);
    });
  });

  describe('isTableInStack', () => {
    it('returns true when a Table element is present', () => {
      const store = new storeFocusObjects();
      store.resetFocusObjects([
        makeFocusObject(c_oAscTypeSelectElement.Paragraph, {}),
        makeFocusObject(c_oAscTypeSelectElement.Table, {}),
      ]);
      expect(store.isTableInStack).toBe(true);
    });

    it('returns false when no Table element is present', () => {
      const store = new storeFocusObjects();
      store.resetFocusObjects([
        makeFocusObject(c_oAscTypeSelectElement.Paragraph, {}),
      ]);
      expect(store.isTableInStack).toBe(false);
    });

    it('returns false for empty stack', () => {
      const store = new storeFocusObjects();
      expect(store.isTableInStack).toBe(false);
    });
  });

  describe('objectLocked', () => {
    it('returns locked state of the top non-SpellCheck object', () => {
      const store = new storeFocusObjects();
      store.resetFocusObjects([
        makeFocusObject(c_oAscTypeSelectElement.Paragraph, { get_Locked: () => true }),
      ]);
      expect(store.objectLocked).toBe(true);
    });

    it('skips SpellCheck objects to find the top object', () => {
      const store = new storeFocusObjects();
      store.resetFocusObjects([
        makeFocusObject(c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false }),
        makeFocusObject(c_oAscTypeSelectElement.SpellCheck, { get_Locked: () => true }),
      ]);
      expect(store.objectLocked).toBe(false);
    });

    it('returns false when object value has no get_Locked method', () => {
      const store = new storeFocusObjects();
      store.resetFocusObjects([
        makeFocusObject(c_oAscTypeSelectElement.Paragraph, {}),
      ]);
      expect(store.objectLocked).toBe(false);
    });

    it('returns undefined for empty stack', () => {
      const store = new storeFocusObjects();
      expect(store.objectLocked).toBeUndefined();
    });
  });

  describe('computed getters with intf', () => {
    it('returns null for all getters when intf is not set', () => {
      const store = new storeFocusObjects();
      expect(store.headerObject).toBeNull();
      expect(store.paragraphObject).toBeNull();
      expect(store.shapeObject).toBeNull();
      expect(store.imageObject).toBeNull();
      expect(store.tableObject).toBeNull();
      expect(store.chartObject).toBeNull();
      expect(store.linkObject).toBeNull();
    });

    it('returns null for settings when intf is not set', () => {
      const store = new storeFocusObjects();
      expect(store.settings).toBeNull();
    });

    it('delegates to intf methods when intf is set', () => {
      const store = new storeFocusObjects();
      store.intf = {
        getHeaderObject: () => 'header-val',
        getParagraphObject: () => 'para-val',
        getShapeObject: () => 'shape-val',
        getImageObject: () => 'image-val',
        getTableObject: () => 'table-val',
        getChartObject: () => 'chart-val',
        getLinkObject: () => 'link-val',
        filterFocusObjects: () => ['text', 'paragraph'],
      };
      expect(store.headerObject).toBe('header-val');
      expect(store.paragraphObject).toBe('para-val');
      expect(store.shapeObject).toBe('shape-val');
      expect(store.imageObject).toBe('image-val');
      expect(store.tableObject).toBe('table-val');
      expect(store.chartObject).toBe('chart-val');
      expect(store.linkObject).toBe('link-val');
      expect(store.settings).toEqual(['text', 'paragraph']);
    });
  });
});
