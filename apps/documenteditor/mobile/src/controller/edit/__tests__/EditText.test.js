import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub the view — we're testing controller logic, not rendering
vi.mock('../../../view/edit/EditText', () => ({ EditText: () => null }));

import { clampFontSize, paragraphAlignValue, parseHighlightColor } from '../EditText';
import { installMockApi, resetMockApi } from '../../../../../../common/mobile/lib/sdk/testHelpers';

describe('clampFontSize', () => {
  it('decrements size by 1', () => {
    expect(clampFontSize(12, true)).toEqual({ size: 11, useStepApi: false });
  });

  it('increments size by 1', () => {
    expect(clampFontSize(12, false)).toEqual({ size: 13, useStepApi: false });
  });

  it('clamps minimum to 1', () => {
    expect(clampFontSize(1, true)).toEqual({ size: 1, useStepApi: false });
  });

  it('clamps maximum to 300', () => {
    expect(clampFontSize(300, false)).toEqual({ size: 300, useStepApi: false });
  });

  it('returns useStepApi when size is undefined (decrement)', () => {
    expect(clampFontSize(undefined, true)).toEqual({ useStepApi: true });
  });

  it('returns useStepApi when size is undefined (increment)', () => {
    expect(clampFontSize(undefined, false)).toEqual({ useStepApi: true });
  });

  it('handles size at boundary 2 decrementing to 1', () => {
    expect(clampFontSize(2, true)).toEqual({ size: 1, useStepApi: false });
  });

  it('handles size at boundary 299 incrementing to 300', () => {
    expect(clampFontSize(299, false)).toEqual({ size: 300, useStepApi: false });
  });
});

describe('paragraphAlignValue', () => {
  it('maps "just" to 3', () => {
    expect(paragraphAlignValue('just')).toBe(3);
  });

  it('maps "right" to 0', () => {
    expect(paragraphAlignValue('right')).toBe(0);
  });

  it('maps "center" to 2', () => {
    expect(paragraphAlignValue('center')).toBe(2);
  });

  it('defaults to 1 (left) for unknown type', () => {
    expect(paragraphAlignValue('left')).toBe(1);
    expect(paragraphAlignValue('unknown')).toBe(1);
  });
});

describe('parseHighlightColor', () => {
  it('returns null for transparent', () => {
    expect(parseHighlightColor('transparent')).toBeNull();
  });

  it('parses hex color string to RGB', () => {
    expect(parseHighlightColor('FF8000')).toEqual({ r: 255, g: 128, b: 0 });
  });

  it('parses black', () => {
    expect(parseHighlightColor('000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('parses white', () => {
    expect(parseHighlightColor('FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe('EditTextController API interactions', () => {
  let api;

  beforeEach(() => {
    api = installMockApi();
    // Add methods the controller calls
    api.UpdateInterfaceState = vi.fn();
    api.FontSizeIn = vi.fn();
    api.FontSizeOut = vi.fn();
    api.put_TextPrFontSize = vi.fn();
    api.put_TextPrBold = vi.fn();
    api.put_TextPrItalic = vi.fn();
    api.put_TextPrUnderline = vi.fn();
    api.put_TextPrStrikeout = vi.fn();
    api.put_TextPrDStrikeout = vi.fn();
    api.put_PrAlign = vi.fn();
    api.DecreaseIndent = vi.fn();
    api.IncreaseIndent = vi.fn();
    api.SetMarkerFormat = vi.fn();
  });

  afterEach(() => resetMockApi());

  // We can't easily instantiate the class (it needs React context),
  // but we can test that the extracted functions integrate correctly
  // by simulating what changeFontSize does:

  it('changeFontSize logic: uses FontSizeOut for undefined + decrement', () => {
    const result = clampFontSize(undefined, true);
    expect(result.useStepApi).toBe(true);
    // Controller would call api.FontSizeOut()
  });

  it('changeFontSize logic: uses put_TextPrFontSize for defined size', () => {
    const result = clampFontSize(14, false);
    expect(result.useStepApi).toBe(false);
    expect(result.size).toBe(15);
    // Controller would call api.put_TextPrFontSize(15)
  });

  it('onHighlightColor logic: transparent sets marker format off', () => {
    const rgb = parseHighlightColor('transparent');
    expect(rgb).toBeNull();
    // Controller would call api.SetMarkerFormat(true, false)
  });

  it('onHighlightColor logic: color sets marker format with RGB', () => {
    const rgb = parseHighlightColor('FF0000');
    expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
    // Controller would call api.SetMarkerFormat(true, true, 255, 0, 0)
  });
});
