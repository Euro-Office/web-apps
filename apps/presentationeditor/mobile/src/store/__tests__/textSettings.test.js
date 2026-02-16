import { describe, it, expect, beforeEach } from 'vitest';
import { storeTextSettings } from '../textSettings';

describe('storeTextSettings (presentation)', () => {
  let store;

  beforeEach(() => {
    store = new storeTextSettings();
  });

  describe('resetParagraphAlign', () => {
    const cases = [
      [0, 'right'],
      [1, 'left'],
      [2, 'center'],
      [3, 'just'],
    ];

    it.each(cases)('maps SDK value %i to "%s"', (sdk, expected) => {
      store.resetParagraphAlign(sdk);
      expect(store.paragraphAlign).toBe(expected);
    });

    it('sets undefined for unknown value', () => {
      store.resetParagraphAlign(99);
      expect(store.paragraphAlign).toBeUndefined();
    });
  });

  describe('resetParagraphValign', () => {
    const cases = [
      [0, 'bottom'],
      [4, 'top'],
      [1, 'center'],
    ];

    it.each(cases)('maps SDK value %i to "%s"', (sdk, expected) => {
      store.resetParagraphValign(sdk);
      expect(store.paragraphValign).toBe(expected);
    });

    it('sets undefined for unknown value', () => {
      store.resetParagraphValign(99);
      expect(store.paragraphValign).toBeUndefined();
    });
  });

  describe('isSuperscript / isSubscript', () => {
    it('isSuperscript is true when typeBaseline matches SuperScript', () => {
      store.resetTypeBaseline(Asc.vertalign_SuperScript);
      expect(store.isSuperscript).toBe(true);
      expect(store.isSubscript).toBe(false);
    });

    it('isSubscript is true when typeBaseline matches SubScript', () => {
      store.resetTypeBaseline(Asc.vertalign_SubScript);
      expect(store.isSuperscript).toBe(false);
      expect(store.isSubscript).toBe(true);
    });

    it('both are false for normal baseline', () => {
      store.resetTypeBaseline(0);
      expect(store.isSuperscript).toBe(false);
      expect(store.isSubscript).toBe(false);
    });
  });

  describe('resetLineSpacing', () => {
    it('returns line value when LineRule is 1', () => {
      const vc = { get_Line: () => 1.5, get_LineRule: () => 1 };
      store.resetLineSpacing(vc);
      expect(store.lineSpacing).toBe(1.5);
    });

    it('returns -1 when LineRule is not 1', () => {
      const vc = { get_Line: () => 1.5, get_LineRule: () => 0 };
      store.resetLineSpacing(vc);
      expect(store.lineSpacing).toBe(-1);
    });

    it('returns -1 when Line is null', () => {
      const vc = { get_Line: () => null, get_LineRule: () => 1 };
      store.resetLineSpacing(vc);
      expect(store.lineSpacing).toBe(-1);
    });

    it('returns -1 when LineRule is null', () => {
      const vc = { get_Line: () => 2.0, get_LineRule: () => null };
      store.resetLineSpacing(vc);
      expect(store.lineSpacing).toBe(-1);
    });
  });

  describe('addFontToRecent', () => {
    it('adds a font to the beginning of the array', () => {
      const font = { name: 'Arial' };
      store.addFontToRecent(font);
      expect(store.arrayRecentFonts).toHaveLength(1);
      expect(store.arrayRecentFonts[0].name).toBe('Arial');
    });

    it('deduplicates existing fonts', () => {
      store.addFontToRecent({ name: 'Arial' });
      store.addFontToRecent({ name: 'Times' });
      store.addFontToRecent({ name: 'Arial' });
      expect(store.arrayRecentFonts).toHaveLength(2);
      expect(store.arrayRecentFonts[0].name).toBe('Arial');
      expect(store.arrayRecentFonts[1].name).toBe('Times');
    });

    it('caps at 5 recent fonts', () => {
      for (let i = 0; i < 7; i++) {
        store.addFontToRecent({ name: `Font${i}` });
      }
      expect(store.arrayRecentFonts.length).toBeLessThanOrEqual(5);
    });
  });

  describe('resetTextColor', () => {
    it('sets "auto" for auto color', () => {
      const color = { get_auto: () => true };
      store.resetTextColor(color);
      expect(store.textColor).toBe('auto');
    });

    it('sets hex string for sRGB color', () => {
      const color = {
        get_auto: () => false,
        get_type: () => Asc.c_oAscColor.COLOR_TYPE_SRGB,
        get_r: () => 255, get_g: () => 0, get_b: () => 0,
      };
      store.resetTextColor(color);
      expect(store.textColor).toBe('ff0000');
    });

    it('sets object with effectValue for scheme color', () => {
      const color = {
        get_auto: () => false,
        get_type: () => Asc.c_oAscColor.COLOR_TYPE_SCHEME,
        get_r: () => 0, get_g: () => 128, get_b: () => 255,
        get_value: () => 5,
      };
      store.resetTextColor(color);
      expect(store.textColor).toEqual({ color: '0080ff', effectValue: 5 });
    });

    it('sets undefined for null color', () => {
      store.resetTextColor(null);
      expect(store.textColor).toBeUndefined();
    });
  });

  describe('resetHighlightColor', () => {
    it('sets "transparent" for -1', () => {
      store.resetHighlightColor(-1);
      expect(store.highlightColor).toBe('transparent');
    });

    it('sets hex from color object', () => {
      store.resetHighlightColor({ get_hex: () => 'ffff00' });
      expect(store.highlightColor).toBe('ffff00');
    });
  });
});
