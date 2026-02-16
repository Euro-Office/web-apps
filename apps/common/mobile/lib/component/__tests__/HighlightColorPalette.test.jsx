import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));
vi.mock('../../../utils/device', () => ({
  Device: { android: true, ios: false, phone: false },
}));

import HighlightColorPalette from '../HighlightColorPalette';

describe('HighlightColorPalette', () => {
  let changeColor;

  beforeEach(() => {
    changeColor = vi.fn();
  });

  it('renders 16 color swatches in 2 rows', () => {
    const { container } = render(
      <HighlightColorPalette changeColor={changeColor} curColor={null} />
    );
    const swatches = container.querySelectorAll('.highlight-color');
    expect(swatches).toHaveLength(16);

    const rows = container.querySelectorAll('.row');
    expect(rows).toHaveLength(2);
  });

  it('calls changeColor with hex value when a swatch is clicked', () => {
    const { container } = render(
      <HighlightColorPalette changeColor={changeColor} curColor={null} />
    );
    const firstSwatch = container.querySelector('.highlight-color');
    fireEvent.click(firstSwatch);
    expect(changeColor).toHaveBeenCalledWith('ffff00');
  });

  it('marks the active color with highlight-color_active class', () => {
    const { container } = render(
      <HighlightColorPalette changeColor={changeColor} curColor="ff0000" />
    );
    const active = container.querySelector('.highlight-color_active');
    expect(active).toBeTruthy();
    // Only one swatch should be active
    const allActive = container.querySelectorAll('.highlight-color_active');
    expect(allActive).toHaveLength(1);
  });

  it('supports curColor as an object with .color property', () => {
    const { container } = render(
      <HighlightColorPalette changeColor={changeColor} curColor={{ color: '00ff00' }} />
    );
    const active = container.querySelector('.highlight-color_active');
    expect(active).toBeTruthy();
  });

  it('shows no active swatch when curColor does not match any color', () => {
    const { container } = render(
      <HighlightColorPalette changeColor={changeColor} curColor="abcdef" />
    );
    const active = container.querySelector('.highlight-color_active');
    expect(active).toBeNull();
  });

  it('renders a "No fill" option that sends transparent', () => {
    const { container } = render(
      <HighlightColorPalette changeColor={changeColor} curColor="transparent" />
    );
    // The "No fill" ListItem has data-radio and data-checked
    const noFillItem = container.querySelector('[data-checked="true"][data-radio="true"]');
    expect(noFillItem).toBeTruthy();

    fireEvent.click(noFillItem);
    expect(changeColor).toHaveBeenCalledWith('transparent');
  });
});
