import { describe, it, expect } from 'vitest';
import { fallbackSdkTranslations } from '../fallbackTranslations';

describe('fallbackSdkTranslations', () => {
  it('is a plain object', () => {
    expect(typeof fallbackSdkTranslations).toBe('object');
    expect(fallbackSdkTranslations).not.toBeNull();
  });

  it('contains base translation keys', () => {
    expect(fallbackSdkTranslations['Header']).toBe('Header');
    expect(fallbackSdkTranslations['Footer']).toBe('Footer');
    expect(fallbackSdkTranslations['Normal']).toBe('Normal');
    expect(fallbackSdkTranslations['Diagram Title']).toBe('Chart Title');
  });

  it('contains all 9 heading levels', () => {
    for (let i = 1; i <= 9; i++) {
      expect(fallbackSdkTranslations[`Heading ${i}`]).toBe(`Heading ${i}`);
    }
  });

  it('contains color theme names', () => {
    const themes = ['Aspect', 'Blue', 'Office', 'Slipstream', 'Yellow'];
    themes.forEach(theme => {
      expect(fallbackSdkTranslations[theme]).toBe(theme);
    });
  });

  it('contains all 23 color themes', () => {
    const allThemes = [
      'Aspect', 'Blue Green', 'Blue II', 'Blue Warm', 'Blue', 'Grayscale',
      'Green Yellow', 'Green', 'Marquee', 'Median', 'Office 2007 - 2010',
      'Office 2013 - 2022', 'Office', 'Orange Red', 'Orange', 'Paper',
      'Red Orange', 'Red Violet', 'Red', 'Slipstream', 'Violet II', 'Violet',
      'Yellow Orange', 'Yellow',
    ];
    allThemes.forEach(theme => {
      expect(fallbackSdkTranslations).toHaveProperty(theme, theme);
    });
  });

  it('maps "No table of contents entries found" to descriptive text', () => {
    expect(fallbackSdkTranslations['No table of contents entries found']).toContain('headings in the document');
  });
});
