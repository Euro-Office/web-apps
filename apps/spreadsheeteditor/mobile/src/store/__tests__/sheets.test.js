import { describe, it, expect, beforeEach } from 'vitest';
import { storeWorksheets } from '../sheets';

describe('storeWorksheets', () => {
  let store;

  beforeEach(() => {
    store = new storeWorksheets();
  });

  describe('resetSheets', () => {
    it('replaces sheets with values from the given object', () => {
      store.resetSheets({
        0: { name: 'Sheet1', active: true, hidden: false },
        1: { name: 'Sheet2', active: false, hidden: false },
      });
      expect(store.sheets).toHaveLength(2);
      expect(store.sheets[0].name).toBe('Sheet1');
    });
  });

  describe('activeWorksheet', () => {
    it('returns the index of the active sheet', () => {
      store.resetSheets({
        0: { name: 'Sheet1', active: false },
        1: { name: 'Sheet2', active: true },
        2: { name: 'Sheet3', active: false },
      });
      expect(store.activeWorksheet).toBe(1);
    });

    it('returns -1 when no sheet is active', () => {
      store.resetSheets({
        0: { name: 'Sheet1', active: false },
      });
      expect(store.activeWorksheet).toBe(-1);
    });
  });

  describe('setActiveWorksheet', () => {
    it('activates the specified sheet and deactivates others', () => {
      store.resetSheets({
        0: { name: 'Sheet1', active: true },
        1: { name: 'Sheet2', active: false },
      });
      store.setActiveWorksheet(1);
      expect(store.sheets[0].active).toBe(false);
      expect(store.sheets[1].active).toBe(true);
    });

    it('does nothing if the sheet is already active', () => {
      store.resetSheets({
        0: { name: 'Sheet1', active: true },
        1: { name: 'Sheet2', active: false },
      });
      store.setActiveWorksheet(0);
      expect(store.sheets[0].active).toBe(true);
      expect(store.sheets[1].active).toBe(false);
    });
  });

  describe('hasHiddenWorksheet', () => {
    it('returns true when a hidden sheet exists', () => {
      store.resetSheets({
        0: { name: 'Sheet1', hidden: false },
        1: { name: 'Sheet2', hidden: true },
      });
      expect(store.hasHiddenWorksheet()).toBe(true);
    });

    it('returns false when no sheets are hidden', () => {
      store.resetSheets({
        0: { name: 'Sheet1', hidden: false },
      });
      expect(store.hasHiddenWorksheet()).toBe(false);
    });
  });

  describe('hiddenWorksheets', () => {
    it('returns only hidden sheets', () => {
      store.resetSheets({
        0: { name: 'Sheet1', hidden: false },
        1: { name: 'Hidden1', hidden: true },
        2: { name: 'Hidden2', hidden: true },
      });
      const hidden = store.hiddenWorksheets();
      expect(hidden).toHaveLength(2);
      expect(hidden[0].name).toBe('Hidden1');
    });
  });

  describe('visibleWorksheets', () => {
    it('returns only visible sheets', () => {
      store.resetSheets({
        0: { name: 'Sheet1', hidden: false },
        1: { name: 'Hidden1', hidden: true },
        2: { name: 'Sheet2', hidden: false },
      });
      const visible = store.visibleWorksheets();
      expect(visible).toHaveLength(2);
      expect(visible[0].name).toBe('Sheet1');
      expect(visible[1].name).toBe('Sheet2');
    });
  });

  describe('setWorksheetLocked', () => {
    it('locks the specified sheet and sets isWorksheetLocked', () => {
      store.resetSheets({
        0: { name: 'Sheet1', locked: false },
      });
      store.setWorksheetLocked(0, true);
      expect(store.sheets[0].locked).toBe(true);
      expect(store.isWorksheetLocked).toBe(true);
    });

    it('handles out-of-bounds index gracefully', () => {
      store.resetSheets({ 0: { name: 'Sheet1', locked: false } });
      store.setWorksheetLocked(5, true);
      expect(store.isWorksheetLocked).toBe(true);
    });
  });

  describe('at', () => {
    it('returns the sheet at the given index', () => {
      store.resetSheets({
        0: { name: 'Sheet1' },
        1: { name: 'Sheet2' },
      });
      expect(store.at(1).name).toBe('Sheet2');
    });
  });
});
