import { describe, it, expect, beforeEach } from 'vitest';
import { storeSlideSettings } from '../slideSettings';

describe('storeSlideSettings', () => {
  let store;

  beforeEach(() => {
    store = new storeSlideSettings();
  });

  describe('slideLayouts', () => {
    it('chunks layouts into rows of 2', () => {
      const layouts = [
        { getIndex: () => 0, get_Image: () => 'img0', get_Width: () => 100, get_Height: () => 75 },
        { getIndex: () => 1, get_Image: () => 'img1', get_Width: () => 100, get_Height: () => 75 },
        { getIndex: () => 2, get_Image: () => 'img2', get_Width: () => 100, get_Height: () => 75 },
        { getIndex: () => 3, get_Image: () => 'img3', get_Width: () => 100, get_Height: () => 75 },
        { getIndex: () => 4, get_Image: () => 'img4', get_Width: () => 100, get_Height: () => 75 },
      ];
      store.addArrayLayouts(layouts);
      const result = store.slideLayouts;

      expect(result).toHaveLength(3); // 5 items => 3 rows (2, 2, 1)
      expect(result[0]).toHaveLength(2);
      expect(result[1]).toHaveLength(2);
      expect(result[2]).toHaveLength(1);
    });

    it('transforms layout SDK objects to plain objects', () => {
      const layouts = [
        { getIndex: () => 5, get_Image: () => 'blank.png', get_Width: () => 200, get_Height: () => 150 },
      ];
      store.addArrayLayouts(layouts);
      const result = store.slideLayouts;

      expect(result[0][0]).toEqual({
        type: 5,
        image: 'blank.png',
        width: 200,
        height: 150,
      });
    });

    it('returns empty array for empty layouts', () => {
      store.addArrayLayouts([]);
      expect(store.slideLayouts).toEqual([]);
    });
  });

  describe('getFillColor', () => {
    it('returns "transparent" for non-solid background', () => {
      const slideObj = {
        get_background: () => ({
          get_type: () => 999,
        }),
      };
      expect(store.getFillColor(slideObj)).toBe('transparent');
    });

    it('returns hex string for solid sRGB background', () => {
      const slideObj = {
        get_background: () => ({
          get_type: () => Asc.c_oAscFill.FILL_TYPE_SOLID,
          get_fill: () => ({
            get_color: () => ({
              get_type: () => Asc.c_oAscColor.COLOR_TYPE_SRGB,
              get_r: () => 0, get_g: () => 100, get_b: () => 200,
            }),
          }),
        }),
      };
      expect(store.getFillColor(slideObj)).toBe('0064c8');
      expect(store.fillColor).toBe('0064c8');
    });

    it('returns object with effectValue for scheme background', () => {
      const slideObj = {
        get_background: () => ({
          get_type: () => Asc.c_oAscFill.FILL_TYPE_SOLID,
          get_fill: () => ({
            get_color: () => ({
              get_type: () => Asc.c_oAscColor.COLOR_TYPE_SCHEME,
              get_r: () => 255, get_g: () => 255, get_b: () => 255,
              get_value: () => 3,
            }),
          }),
        }),
      };
      const result = store.getFillColor(slideObj);
      expect(result).toEqual({ color: 'ffffff', effectValue: 3 });
    });
  });

  describe('changeSlideLayoutIndex', () => {
    it('updates slideLayoutIndex', () => {
      store.changeSlideLayoutIndex(5);
      expect(store.slideLayoutIndex).toBe(5);
    });
  });

  describe('changeSlideThemeIndex', () => {
    it('updates slideThemeIndex', () => {
      store.changeSlideThemeIndex(2);
      expect(store.slideThemeIndex).toBe(2);
    });
  });
});
