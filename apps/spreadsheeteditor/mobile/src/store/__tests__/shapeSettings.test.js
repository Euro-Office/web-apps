import { describe, it, expect, beforeEach } from 'vitest';
import { storeShapeSettings } from '../shapeSettings';

describe('storeShapeSettings', () => {
  let store;

  beforeEach(() => {
    store = new storeShapeSettings();
  });

  describe('getStyleGroups', () => {
    it('returns rows of 4 shapes', () => {
      const groups = store.getStyleGroups();
      groups.forEach(group => {
        expect(group).toHaveLength(4);
      });
    });

    it('returns 6 rows from 24 shapes', () => {
      const groups = store.getStyleGroups();
      expect(groups).toHaveLength(6);
    });

    it('first shape is Text/textRect', () => {
      const groups = store.getStyleGroups();
      expect(groups[0][0]).toEqual({
        title: 'Text',
        thumb: 'shape-01.svg',
        type: 'textRect',
      });
    });

    it('last shape in last row is Cloud callout', () => {
      const groups = store.getStyleGroups();
      const lastRow = groups[groups.length - 1];
      expect(lastRow[lastRow.length - 1].type).toBe('cloudCallout');
    });
  });

  describe('borderSizeTransform', () => {
    let transform;

    beforeEach(() => {
      transform = store.borderSizeTransform();
    });

    it('sizeByIndex returns 0 for index < 1', () => {
      expect(transform.sizeByIndex(0)).toBe(0);
      expect(transform.sizeByIndex(-1)).toBe(0);
    });

    it('sizeByIndex returns last value for index beyond range', () => {
      expect(transform.sizeByIndex(100)).toBe(6);
    });

    it('sizeByIndex returns correct value for valid index', () => {
      expect(transform.sizeByIndex(1)).toBe(0.5);
      expect(transform.sizeByIndex(3)).toBe(1.5);
      expect(transform.sizeByIndex(7)).toBe(6);
    });

    it('indexSizeByValue finds closest matching index', () => {
      expect(transform.indexSizeByValue(0)).toBe(0);
      expect(transform.indexSizeByValue(0.5)).toBe(1);
      expect(transform.indexSizeByValue(1.5)).toBe(3);
      expect(transform.indexSizeByValue(6)).toBe(7);
    });

    it('indexSizeByValue handles approximate values', () => {
      // 0.6 is within 0.25 of 0.5 (index 1)
      expect(transform.indexSizeByValue(0.6)).toBe(1);
    });

    it('sizeByValue returns the size at the closest index', () => {
      expect(transform.sizeByValue(1.5)).toBe(1.5);
      expect(transform.sizeByValue(6)).toBe(6);
    });
  });

  describe('getFillColor', () => {
    it('returns "transparent" for non-solid fill', () => {
      const shapeObj = {
        asc_getFill: () => ({
          asc_getType: () => 999,
        }),
      };
      const color = store.getFillColor(shapeObj);
      expect(color).toBe('transparent');
      expect(store.fillColor).toBe('transparent');
    });

    it('returns hex string for solid sRGB fill', () => {
      const shapeObj = {
        asc_getFill: () => ({
          asc_getType: () => Asc.c_oAscFill.FILL_TYPE_SOLID,
          get_fill: () => ({
            asc_getColor: () => ({
              get_type: () => Asc.c_oAscColor.COLOR_TYPE_SRGB,
              get_r: () => 255,
              get_g: () => 128,
              get_b: () => 0,
            }),
          }),
        }),
      };
      const color = store.getFillColor(shapeObj);
      expect(color).toBe('ff8000');
      expect(store.fillColor).toBe('ff8000');
    });

    it('returns object with effectValue for scheme fill', () => {
      const shapeObj = {
        asc_getFill: () => ({
          asc_getType: () => Asc.c_oAscFill.FILL_TYPE_SOLID,
          get_fill: () => ({
            asc_getColor: () => ({
              get_type: () => Asc.c_oAscColor.COLOR_TYPE_SCHEME,
              get_r: () => 0, get_g: () => 0, get_b: () => 255,
              get_value: () => 7,
            }),
          }),
        }),
      };
      const color = store.getFillColor(shapeObj);
      expect(color).toEqual({ color: '0000ff', effectValue: 7 });
    });
  });

  describe('initBorderColorView', () => {
    it('returns "transparent" when no stroke', () => {
      const shapeObj = { get_stroke: () => null };
      expect(store.initBorderColorView(shapeObj)).toBe('transparent');
    });

    it('returns "transparent" for non-color stroke type', () => {
      const shapeObj = {
        get_stroke: () => ({
          get_type: () => 999,
        }),
      };
      expect(store.initBorderColorView(shapeObj)).toBe('transparent');
    });

    it('returns hex string for sRGB stroke color', () => {
      const shapeObj = {
        get_stroke: () => ({
          get_type: () => Asc.c_oAscStrokeType.STROKE_COLOR,
          get_color: () => ({
            get_type: () => Asc.c_oAscColor.COLOR_TYPE_SRGB,
            get_r: () => 128, get_g: () => 0, get_b: () => 64,
          }),
        }),
      };
      expect(store.initBorderColorView(shapeObj)).toBe('800040');
      expect(store.borderColorView).toBe('800040');
    });
  });
});
