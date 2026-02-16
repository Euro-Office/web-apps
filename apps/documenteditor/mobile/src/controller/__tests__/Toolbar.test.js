import { describe, it, expect, vi } from 'vitest';

// Stub heavy imports that Toolbar pulls in
vi.mock('../../../../common/mobile/utils/device', () => ({
  Device: { phone: false, tablet: true, ios: false, android: true },
}));
vi.mock('framework7-react', () => ({
  f7: { popover: { close: vi.fn() }, sheet: { close: vi.fn() }, popup: { close: vi.fn() }, navbar: { hide: vi.fn(), show: vi.fn() }, dialog: { create: vi.fn(() => ({ open: vi.fn() })) }, toggle: { get: vi.fn() } },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
  withTranslation: () => (c) => c,
}));
vi.mock('../../view/Toolbar', () => ({ default: () => null }));
vi.mock('../../../../common/mobile/utils/LocalStorage.mjs', () => ({
  LocalStorage: { setBool: vi.fn() },
}));

import { cutDocName, parseGobackConfig } from '../Toolbar';

describe('cutDocName', () => {
  it('strips matching extension', () => {
    expect(cutDocName('report.docx', 'docx')).toBe('report.');
  });

  it('returns name unchanged when extension does not match', () => {
    expect(cutDocName('report.xlsx', 'docx')).toBe('report.xlsx');
  });

  it('returns name when shorter than extension', () => {
    expect(cutDocName('a', 'docx')).toBe('a');
  });

  it('returns name when same length as extension but no match', () => {
    expect(cutDocName('abcd', 'docx')).toBe('abcd');
  });

  it('strips extension from name with dots', () => {
    expect(cutDocName('my.report.v2.docx', 'docx')).toBe('my.report.v2.');
  });
});

describe('parseGobackConfig', () => {
  it('returns null for null data', () => {
    expect(parseGobackConfig(null)).toBeNull();
  });

  it('returns null when no customization', () => {
    expect(parseGobackConfig({ config: {} })).toBeNull();
  });

  it('returns null when canBackToFolder is false', () => {
    expect(parseGobackConfig({
      config: { canBackToFolder: false, customization: { goback: { url: 'http://x' } } },
    })).toBeNull();
  });

  it('returns true when goback url is set and close is undefined', () => {
    expect(parseGobackConfig({
      config: { customization: { goback: { url: 'http://x' } } },
    })).toBe(true);
  });

  it('returns true when requestClose is true and canRequestClose is true', () => {
    expect(parseGobackConfig({
      config: { canRequestClose: true, customization: { goback: { requestClose: true } } },
    })).toBe(true);
  });

  it('returns false when goback exists but url and requestClose are both falsy', () => {
    expect(parseGobackConfig({
      config: { customization: { goback: {} } },
    })).toBe(false);
  });

  it('returns true when close is defined and url is set without requestClose', () => {
    expect(parseGobackConfig({
      config: { customization: { close: true, goback: { url: 'http://x' } } },
    })).toBe(true);
  });

  it('returns false when close is defined and requestClose is true (overrides url)', () => {
    expect(parseGobackConfig({
      config: { customization: { close: true, goback: { url: 'http://x', requestClose: true } } },
    })).toBe(false);
  });
});
