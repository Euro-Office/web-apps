import { describe, it, expect } from 'vitest';
import React from 'react';
import { createObjectGetter, buildFocusObjectGetters, PlatformIcon } from '../editor';

// Helper: create a mock focus object matching the SDK shape
const makeFocusObject = (type, value) => ({
  get_ObjectType: () => type,
  get_ObjectValue: () => value,
});

describe('createObjectGetter', () => {
  it('returns undefined when no objects match the type', () => {
    const store = { _focusObjects: [] };
    const getter = createObjectGetter(store, Asc.c_oAscTypeSelectElement.Paragraph);
    expect(getter()).toBeUndefined();
  });

  it('returns the value of the last matching object', () => {
    const store = {
      _focusObjects: [
        makeFocusObject(Asc.c_oAscTypeSelectElement.Paragraph, 'first'),
        makeFocusObject(Asc.c_oAscTypeSelectElement.Paragraph, 'second'),
      ],
    };
    const getter = createObjectGetter(store, Asc.c_oAscTypeSelectElement.Paragraph);
    expect(getter()).toBe('second');
  });

  it('ignores objects of a different type', () => {
    const store = {
      _focusObjects: [
        makeFocusObject(Asc.c_oAscTypeSelectElement.Table, 'table-val'),
        makeFocusObject(Asc.c_oAscTypeSelectElement.Paragraph, 'para-val'),
      ],
    };
    const getter = createObjectGetter(store, Asc.c_oAscTypeSelectElement.Table);
    expect(getter()).toBe('table-val');
  });

  it('applies extraCheck filter', () => {
    const store = {
      _focusObjects: [
        makeFocusObject(Asc.c_oAscTypeSelectElement.Image, { shape: true }),
        makeFocusObject(Asc.c_oAscTypeSelectElement.Image, { shape: false }),
      ],
    };
    const getter = createObjectGetter(
      store,
      Asc.c_oAscTypeSelectElement.Image,
      (obj) => obj.get_ObjectValue().shape === true,
    );
    expect(getter()).toEqual({ shape: true });
  });

  it('returns undefined when extraCheck filters out all matches', () => {
    const store = {
      _focusObjects: [
        makeFocusObject(Asc.c_oAscTypeSelectElement.Image, { shape: false }),
      ],
    };
    const getter = createObjectGetter(
      store,
      Asc.c_oAscTypeSelectElement.Image,
      (obj) => obj.get_ObjectValue().shape === true,
    );
    expect(getter()).toBeUndefined();
  });
});

describe('buildFocusObjectGetters', () => {
  it('creates named getters on store.intf', () => {
    const store = {
      _focusObjects: [
        makeFocusObject(Asc.c_oAscTypeSelectElement.Paragraph, 'para-val'),
        makeFocusObject(Asc.c_oAscTypeSelectElement.Table, 'table-val'),
      ],
    };

    buildFocusObjectGetters(store, {
      getParagraphObject: { type: Asc.c_oAscTypeSelectElement.Paragraph },
      getTableObject: { type: Asc.c_oAscTypeSelectElement.Table },
    });

    expect(store.intf.getParagraphObject()).toBe('para-val');
    expect(store.intf.getTableObject()).toBe('table-val');
  });

  it('initializes store.intf if not present', () => {
    const store = { _focusObjects: [] };
    buildFocusObjectGetters(store, {
      getFoo: { type: Asc.c_oAscTypeSelectElement.Paragraph },
    });
    expect(store.intf).toBeDefined();
    expect(typeof store.intf.getFoo).toBe('function');
  });

  it('preserves existing intf properties', () => {
    const store = {
      _focusObjects: [],
      intf: { existing: 'value' },
    };
    buildFocusObjectGetters(store, {
      getFoo: { type: Asc.c_oAscTypeSelectElement.Paragraph },
    });
    expect(store.intf.existing).toBe('value');
    expect(typeof store.intf.getFoo).toBe('function');
  });
});

describe('PlatformIcon', () => {
  it('renders an svg element', () => {
    const el = PlatformIcon({ ios: { id: 'ios-icon' }, android: { id: 'android-icon' } });
    expect(el.type).toBeDefined();
    expect(el.props.slot).toBe('media');
  });

  it('uses the android icon id when Device.ios is false', () => {
    const el = PlatformIcon({ ios: { id: 'ios-icon' }, android: { id: 'android-icon' } });
    // Device.ios comes from f7.device.ios which is false in our stub
    expect(el.props.symbolId).toBe('android-icon');
  });

  it('applies default className', () => {
    const el = PlatformIcon({ ios: { id: 'a' }, android: { id: 'b' } });
    expect(el.props.className).toBe('icon icon-svg');
  });

  it('accepts custom className', () => {
    const el = PlatformIcon({ ios: { id: 'a' }, android: { id: 'b' }, className: 'custom' });
    expect(el.props.className).toBe('custom');
  });
});
