import { describe, it, expect, beforeEach } from 'vitest';
import { storeFocusObjects } from '../focusObjects';

const makeObj = (type, value) => ({
  get_ObjectType: () => type,
  get_ObjectValue: () => value,
});

describe('storeFocusObjects (presentation)', () => {
  let store;

  beforeEach(() => {
    store = new storeFocusObjects();
  });

  describe('resetFocusObjects', () => {
    it('replaces _focusObjects with the given array', () => {
      const objects = [makeObj(0, {})];
      store.resetFocusObjects(objects);
      expect(store._focusObjects).toHaveLength(1);
    });
  });

  describe('paragraphLocked', () => {
    it('returns locked state of paragraph objects', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Paragraph, { get_Locked: () => true }),
      ]);
      expect(store.paragraphLocked).toBe(true);
    });

    it('returns false when paragraph is not locked', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false }),
      ]);
      expect(store.paragraphLocked).toBe(false);
    });

    it('returns false when no paragraph in stack', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Image, { get_Locked: () => true }),
      ]);
      expect(store.paragraphLocked).toBe(false);
    });

    it('returns lock state of the last paragraph when multiple exist', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Paragraph, { get_Locked: () => true }),
        makeObj(Asc.c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false }),
      ]);
      expect(store.paragraphLocked).toBe(false);
    });
  });

  describe('isTableInStack', () => {
    it('returns true when a Table element is present', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Paragraph, {}),
        makeObj(Asc.c_oAscTypeSelectElement.Table, {}),
      ]);
      expect(store.isTableInStack).toBe(true);
    });

    it('returns false when no Table element is present', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Paragraph, {}),
      ]);
      expect(store.isTableInStack).toBe(false);
    });
  });

  describe('isEditLocked', () => {
    it('returns undefined for empty stack', () => {
      store.resetFocusObjects([]);
      expect(store.isEditLocked).toBeUndefined();
    });

    it('returns true when slide is delete-locked', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Slide, {
          get_LockDelete: () => true,
          get_LockLayout: () => false,
          get_LockBackground: () => false,
          get_LockTransition: () => false,
          get_LockTiming: () => false,
        }),
      ]);
      expect(store.isEditLocked).toBe(true);
    });

    it('returns true when slide has layout lock and no objects', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Slide, {
          get_LockDelete: () => false,
          get_LockLayout: () => true,
          get_LockBackground: () => false,
          get_LockTransition: () => false,
          get_LockTiming: () => false,
        }),
      ]);
      // no_object=true, slide_lock=true => (false || (false || true) && true) => true
      expect(store.isEditLocked).toBe(true);
    });

    it('returns false when slide is unlocked and object is unlocked', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Slide, {
          get_LockDelete: () => false,
          get_LockLayout: () => false,
          get_LockBackground: () => false,
          get_LockTransition: () => false,
          get_LockTiming: () => false,
        }),
        makeObj(Asc.c_oAscTypeSelectElement.Shape, {
          get_Locked: () => false,
        }),
      ]);
      // slide_deleted=false, no_object=false, objectLocked=false, slide_lock=false
      // => (false || (false || false) && false) => false
      expect(store.isEditLocked).toBe(false);
    });

    it('returns true when object is locked and slide has layout lock', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Slide, {
          get_LockDelete: () => false,
          get_LockLayout: () => true,
          get_LockBackground: () => false,
          get_LockTransition: () => false,
          get_LockTiming: () => false,
        }),
        makeObj(Asc.c_oAscTypeSelectElement.Shape, {
          get_Locked: () => true,
        }),
      ]);
      // slide_deleted=false, objectLocked=true, slide_lock=true
      // => (false || (true || false) && true) => true
      expect(store.isEditLocked).toBe(true);
    });

    it('returns false when object is locked but slide has no lock', () => {
      store.resetFocusObjects([
        makeObj(Asc.c_oAscTypeSelectElement.Slide, {
          get_LockDelete: () => false,
          get_LockLayout: () => false,
          get_LockBackground: () => false,
          get_LockTransition: () => false,
          get_LockTiming: () => false,
        }),
        makeObj(Asc.c_oAscTypeSelectElement.Shape, {
          get_Locked: () => true,
        }),
      ]);
      // objectLocked=true, slide_lock=false => (true || false) && false => false
      expect(store.isEditLocked).toBe(false);
    });
  });

  describe('computed getters with intf', () => {
    it('returns null for all getters when intf is not set', () => {
      expect(store.settings).toBeNull();
      expect(store.slideObject).toBeNull();
      expect(store.paragraphObject).toBeNull();
      expect(store.shapeObject).toBeNull();
      expect(store.imageObject).toBeNull();
      expect(store.tableObject).toBeNull();
      expect(store.chartObject).toBeNull();
      expect(store.linkObject).toBeNull();
    });

    it('delegates to intf methods when intf is set', () => {
      const mockSlide = { id: 'slide1' };
      store.intf = {
        filterFocusObjects: () => ['text', 'shape'],
        getSlideObject: () => mockSlide,
        getParagraphObject: () => null,
        getShapeObject: () => null,
        getImageObject: () => null,
        getTableObject: () => null,
        getChartObject: () => null,
        getLinkObject: () => null,
      };
      expect(store.settings).toEqual(['text', 'shape']);
      expect(store.slideObject).toBe(mockSlide);
    });
  });
});
