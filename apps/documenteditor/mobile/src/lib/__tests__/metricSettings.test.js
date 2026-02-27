import { describe, it, expect } from 'vitest';
import { resolveRegion, isImperialRegion } from '../metricSettings';

describe('resolveRegion', () => {
  const noLangInfo = null;

  it('returns location directly when set (deprecated path)', () => {
    expect(resolveRegion({ location: 'US' }, noLangInfo, '')).toBe('US');
  });

  it('extracts region suffix from options.region string', () => {
    expect(resolveRegion({ region: 'en-GB' }, noLangInfo, '')).toBe('GB');
  });

  it('uses languageInfo to resolve known region codes', () => {
    const langInfo = {
      getLanguages: () => ({ 1033: true }),
      getLocalLanguageName: () => ['English (United States)'],
    };
    // '1033' is a known language key, so getLocalLanguageName returns a name
    // that name has no dash/underscore, so region ends up empty
    expect(resolveRegion({ region: '1033' }, langInfo, '')).toBe('');
  });

  it('uses languageInfo resolved value when it contains a region suffix', () => {
    const langInfo = {
      getLanguages: () => ({ 'fr': true }),
      getLocalLanguageName: () => ['fr-CA'],
    };
    expect(resolveRegion({ region: 'fr' }, langInfo, '')).toBe('CA');
  });

  it('falls back to lang when no location or region', () => {
    expect(resolveRegion({ lang: 'en-US' }, noLangInfo, '')).toBe('US');
  });

  it('falls back to navigator.language when lang has no region', () => {
    expect(resolveRegion({ lang: 'en' }, noLangInfo, 'fr-CA')).toBe('CA');
  });

  it('returns empty string when nothing provides a region', () => {
    expect(resolveRegion({}, noLangInfo, '')).toBe('');
    expect(resolveRegion({ lang: 'en' }, noLangInfo, 'de')).toBe('');
  });

  it('defaults lang to "en" when not provided', () => {
    expect(resolveRegion({}, noLangInfo, 'pt-BR')).toBe('BR');
  });

  it('handles underscore separators', () => {
    expect(resolveRegion({ lang: 'en_US' }, noLangInfo, '')).toBe('US');
    expect(resolveRegion({ region: 'zh_TW' }, noLangInfo, '')).toBe('TW');
  });
});

describe('isImperialRegion', () => {
  it('returns true for US and CA (case-insensitive)', () => {
    expect(isImperialRegion('us')).toBe(true);
    expect(isImperialRegion('US')).toBe(true);
    expect(isImperialRegion('ca')).toBe(true);
    expect(isImperialRegion('CA')).toBe(true);
  });

  it('returns false for other regions', () => {
    expect(isImperialRegion('GB')).toBe(false);
    expect(isImperialRegion('DE')).toBe(false);
    expect(isImperialRegion('')).toBe(false);
  });
});
