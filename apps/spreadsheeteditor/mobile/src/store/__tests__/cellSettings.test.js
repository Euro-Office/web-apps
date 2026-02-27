import { describe, it, expect, beforeEach } from 'vitest';
import { storeCellSettings } from '../cellSettings';

describe('storeCellSettings', () => {
  let store;

  beforeEach(() => {
    store = new storeCellSettings();
  });

  describe('initTextOrientation', () => {
    const cases = [
      [45, 'anglecount'],
      [-45, 'angleclock'],
      [255, 'vertical'],
      [90, 'rotateup'],
      [-90, 'rotatedown'],
      [0, 'horizontal'],
    ];

    it.each(cases)('maps angle %i to "%s"', (angle, expected) => {
      const xfs = { asc_getAngle: () => angle };
      store.initTextOrientation(xfs);
      expect(store.orientationStr).toBe(expected);
    });

    it('leaves orientation unchanged for unknown angle', () => {
      store.orientationStr = 'horizontal';
      const xfs = { asc_getAngle: () => 999 };
      store.initTextOrientation(xfs);
      expect(store.orientationStr).toBe('horizontal');
    });
  });

  describe('initTextFormat', () => {
    it('maps vertical alignment from SDK constants', () => {
      const xfs = {
        asc_getHorAlign: () => AscCommon.align_Left,
        asc_getVertAlign: () => Asc.c_oAscVAlign.Top,
        asc_getWrapText: () => false,
      };
      store.initTextFormat(xfs);
      expect(store.vAlignStr).toBe('top');
      expect(store.hAlignStr).toBe('left');
      expect(store.isWrapText).toBe(false);
    });

    it('maps center alignment', () => {
      const xfs = {
        asc_getHorAlign: () => AscCommon.align_Center,
        asc_getVertAlign: () => Asc.c_oAscVAlign.Center,
        asc_getWrapText: () => true,
      };
      store.initTextFormat(xfs);
      expect(store.vAlignStr).toBe('center');
      expect(store.hAlignStr).toBe('center');
      expect(store.isWrapText).toBe(true);
    });

    it('maps right and bottom alignment', () => {
      const xfs = {
        asc_getHorAlign: () => AscCommon.align_Right,
        asc_getVertAlign: () => Asc.c_oAscVAlign.Bottom,
        asc_getWrapText: () => false,
      };
      store.initTextFormat(xfs);
      expect(store.vAlignStr).toBe('bottom');
      expect(store.hAlignStr).toBe('right');
    });

    it('maps justify alignment', () => {
      const xfs = {
        asc_getHorAlign: () => AscCommon.align_Justify,
        asc_getVertAlign: () => Asc.c_oAscVAlign.Bottom,
        asc_getWrapText: () => false,
      };
      store.initTextFormat(xfs);
      expect(store.hAlignStr).toBe('justify');
    });
  });

  describe('resetColor', () => {
    it('returns "transparent" for null color', () => {
      expect(store.resetColor(null)).toBe('transparent');
    });

    it('returns "auto" for auto color', () => {
      const color = { get_auto: () => true };
      expect(store.resetColor(color)).toBe('auto');
    });

    it('returns hex string for non-scheme color', () => {
      const color = {
        get_auto: () => false,
        get_type: () => Asc.c_oAscColor.COLOR_TYPE_SRGB,
        get_r: () => 255,
        get_g: () => 0,
        get_b: () => 128,
      };
      expect(store.resetColor(color)).toBe('ff0080');
    });

    it('returns object with effectValue for scheme color', () => {
      const color = {
        get_auto: () => false,
        get_type: () => Asc.c_oAscColor.COLOR_TYPE_SCHEME,
        get_r: () => 0,
        get_g: () => 0,
        get_b: () => 0,
        get_value: () => 42,
      };
      const result = store.resetColor(color);
      expect(result).toEqual({ color: '000000', effectValue: 42 });
    });
  });

  describe('initFontSettings', () => {
    it('sets font info and formatting state from xfs', () => {
      const xfs = {
        asc_getFontName: () => 'Calibri',
        asc_getFontSize: () => 11,
        asc_getFontColor: () => ({
          get_auto: () => false,
          get_type: () => Asc.c_oAscColor.COLOR_TYPE_SRGB,
          get_r: () => 0, get_g: () => 0, get_b: () => 0,
        }),
        asc_getFontBold: () => true,
        asc_getFontItalic: () => false,
        asc_getFontUnderline: () => true,
        asc_getFontStrikeout: () => false,
      };
      store.initFontSettings(xfs);
      expect(store.fontInfo.name).toBe('Calibri');
      expect(store.fontInfo.size).toBe(11);
      expect(store.isBold).toBe(true);
      expect(store.isItalic).toBe(false);
      expect(store.isUnderline).toBe(true);
      expect(store.isStrikethrough).toBe(false);
    });
  });

  describe('initEditorFonts', () => {
    it('transforms SDK font objects to plain objects', () => {
      const fonts = [
        { asc_getFontId: () => 1, asc_getFontName: () => 'Arial', asc_getFontThumbnail: () => 0, asc_getFontType: () => 0 },
        { asc_getFontId: () => 2, asc_getFontName: () => 'Times', asc_getFontThumbnail: () => 1, asc_getFontType: () => 1 },
      ];
      store.initEditorFonts(fonts);
      expect(store.fontsArray).toHaveLength(2);
      expect(store.fontsArray[0]).toEqual({ id: 1, name: 'Arial', imgidx: 0, type: 0 });
      expect(store.fontsArray[1]).toEqual({ id: 2, name: 'Times', imgidx: 1, type: 1 });
    });
  });
});
