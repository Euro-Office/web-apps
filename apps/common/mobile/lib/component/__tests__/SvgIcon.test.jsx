import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SvgIcon from '../SvgIcon';

describe('SvgIcon', () => {
  it('renders an svg with a use element referencing the symbolId', () => {
    const { container } = render(<SvgIcon symbolId="icon-bold" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.classList.contains('svg-icon')).toBe(true);

    const use = svg.querySelector('use');
    expect(use).toBeTruthy();
    expect(use.getAttribute('href')).toBe('#icon-bold');
  });

  it('applies custom className', () => {
    const { container } = render(<SvgIcon symbolId="icon-test" className="icon icon-svg" />);
    const svg = container.querySelector('svg');
    expect(svg.classList.contains('icon')).toBe(true);
    expect(svg.classList.contains('icon-svg')).toBe(true);
  });

  it('forwards additional props', () => {
    const { container } = render(<SvgIcon symbolId="icon-test" data-slot="media" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-slot')).toBe('media');
  });
});
