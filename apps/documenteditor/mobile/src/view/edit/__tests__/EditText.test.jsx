import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));
vi.mock('../../../../../../common/mobile/utils/device', () => ({
  Device: { android: true, ios: false, phone: false },
}));
vi.mock('../../../../../../common/mobile/lib/component/ThemeColorPalette.jsx', () => ({
  ThemeColorPalette: () => null,
  CustomColorPicker: () => null,
}));
vi.mock('../../../../../../common/mobile/utils/LocalStorage.mjs', () => ({
  LocalStorage: { setItem: vi.fn(), getItem: vi.fn() },
}));

// Import the inner unwrapped components by importing the full module
// PageLineSpacing is the inner component (not the inject-wrapped export)
import * as EditTextModule from '../EditText';

// The file exports wrapped versions. We need to test the inner components.
// We can test the wrapped versions by providing a MobX Provider.
// But it's simpler to import the file and test with Provider for the wrapped exports.
import { Provider } from 'mobx-react';

const makeTextStore = (overrides = {}) => ({
  fontName: 'Arial',
  fontSize: 12,
  textColor: 'auto',
  highlightColor: 'transparent',
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrikethrough: false,
  paragraphAlign: 'left',
  listType: -1,
  lineSpacing: 1.5,
  ...overrides,
});

const makeFocusStore = (overrides = {}) => ({
  shapeObject: null,
  tableObject: null,
  ...overrides,
});

describe('PageTextLineSpacing (wrapped)', () => {
  it('renders 6 spacing options', () => {
    const onLineSpacing = vi.fn();
    const store = makeTextStore({ lineSpacing: 1.5 });

    const { container } = render(
      <Provider storeTextSettings={store}>
        <EditTextModule.PageTextLineSpacing onLineSpacing={onLineSpacing} />
      </Provider>
    );

    const items = container.querySelectorAll('[data-radio="true"]');
    expect(items).toHaveLength(6);
  });

  it('marks the current spacing as checked', () => {
    const store = makeTextStore({ lineSpacing: 2.0 });

    const { container } = render(
      <Provider storeTextSettings={store}>
        <EditTextModule.PageTextLineSpacing onLineSpacing={vi.fn()} />
      </Provider>
    );

    const checked = container.querySelectorAll('[data-checked="true"]');
    expect(checked).toHaveLength(1);
    expect(checked[0].getAttribute('data-title')).toBe('2');
  });

  it('calls onLineSpacing with the selected value when clicked', () => {
    const onLineSpacing = vi.fn();
    const store = makeTextStore({ lineSpacing: 1.0 });

    const { container } = render(
      <Provider storeTextSettings={store}>
        <EditTextModule.PageTextLineSpacing onLineSpacing={onLineSpacing} />
      </Provider>
    );

    // Click the "2.5" option
    const items = container.querySelectorAll('[data-radio="true"]');
    const item25 = Array.from(items).find(el => el.getAttribute('data-title') === '2.5');
    fireEvent.click(item25);
    expect(onLineSpacing).toHaveBeenCalledWith(2.5);
  });
});

describe('EditText (wrapped)', () => {
  const defaultProps = {
    changeFontSize: vi.fn(),
    changeFontFamily: vi.fn(),
    toggleBold: vi.fn(),
    toggleItalic: vi.fn(),
    toggleUnderline: vi.fn(),
    toggleStrikethrough: vi.fn(),
    onTextColorAuto: vi.fn(),
    onTextColor: vi.fn(),
    onHighlightColor: vi.fn(),
    onAdditionalStrikethrough: vi.fn(),
    onAdditionalCaps: vi.fn(),
    onAdditionalScript: vi.fn(),
    changeLetterSpacing: vi.fn(),
    onParagraphAlign: vi.fn(),
    onParagraphMove: vi.fn(),
    setOrientationTextShape: vi.fn(),
    setOrientationTextTable: vi.fn(),
    onBullet: vi.fn(),
    onNumber: vi.fn(),
    onMultiLevelList: vi.fn(),
    getIconsBulletsAndNumbers: vi.fn(),
    updateBulletsNumbers: vi.fn(),
    onLineSpacing: vi.fn(),
    updateListType: vi.fn(),
  };

  it('renders font name and size', () => {
    const store = makeTextStore({ fontName: 'Times New Roman', fontSize: 14 });
    const focusStore = makeFocusStore();

    const { container } = render(
      <Provider storeTextSettings={store} storeFocusObjects={focusStore}>
        <EditTextModule.EditText {...defaultProps} />
      </Provider>
    );

    // Font name should appear as a link title
    const fontItem = container.querySelector('[data-title="Times New Roman"]');
    expect(fontItem).toBeTruthy();
  });

  it('renders bold/italic/underline/strikethrough buttons', () => {
    const store = makeTextStore({ isBold: true, isItalic: false });
    const focusStore = makeFocusStore();

    const { container } = render(
      <Provider storeTextSettings={store} storeFocusObjects={focusStore}>
        <EditTextModule.EditText {...defaultProps} />
      </Provider>
    );

    const buttons = container.querySelectorAll('.buttons .button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);

    // Bold should have 'active' class
    const boldBtn = Array.from(buttons).find(b => b.querySelector('b'));
    expect(boldBtn.classList.contains('active')).toBe(true);
  });

  it('calls toggleBold when B button is clicked', () => {
    const toggleBold = vi.fn();
    const store = makeTextStore({ isBold: false });
    const focusStore = makeFocusStore();

    const { container } = render(
      <Provider storeTextSettings={store} storeFocusObjects={focusStore}>
        <EditTextModule.EditText {...defaultProps} toggleBold={toggleBold} />
      </Provider>
    );

    const boldBtn = container.querySelector('.buttons .button b').parentElement;
    fireEvent.click(boldBtn);
    expect(toggleBold).toHaveBeenCalledWith(true);
  });

  it('renders paragraph alignment buttons with active state', () => {
    const store = makeTextStore({ paragraphAlign: 'center' });
    const focusStore = makeFocusStore();

    const { container } = render(
      <Provider storeTextSettings={store} storeFocusObjects={focusStore}>
        <EditTextModule.EditText {...defaultProps} />
      </Provider>
    );

    // Find alignment button rows (second .buttons element)
    const buttonRows = container.querySelectorAll('.buttons');
    expect(buttonRows.length).toBeGreaterThanOrEqual(2);

    const alignBtns = buttonRows[1].querySelectorAll('.button');
    // center is the second button (left, center, right, just)
    expect(alignBtns[1].classList.contains('active')).toBe(true);
    expect(alignBtns[0].classList.contains('active')).toBe(false);
  });

  it('calls onParagraphAlign with alignment type on click', () => {
    const onParagraphAlign = vi.fn();
    const store = makeTextStore();
    const focusStore = makeFocusStore();

    const { container } = render(
      <Provider storeTextSettings={store} storeFocusObjects={focusStore}>
        <EditTextModule.EditText {...defaultProps} onParagraphAlign={onParagraphAlign} />
      </Provider>
    );

    const buttonRows = container.querySelectorAll('.buttons');
    const alignBtns = buttonRows[1].querySelectorAll('.button');
    // Click "right" (3rd button)
    fireEvent.click(alignBtns[2]);
    expect(onParagraphAlign).toHaveBeenCalledWith('right');
  });

  it('shows indent buttons when not in SmartArt internal', () => {
    const store = makeTextStore();
    const focusStore = makeFocusStore();

    const { container } = render(
      <Provider storeTextSettings={store} storeFocusObjects={focusStore}>
        <EditTextModule.EditText {...defaultProps} />
      </Provider>
    );

    // Indent buttons are in the third .buttons row
    const buttonRows = container.querySelectorAll('.buttons');
    expect(buttonRows.length).toBeGreaterThanOrEqual(3);
  });

  it('hides indent buttons when in SmartArt internal', () => {
    const store = makeTextStore();
    const focusStore = makeFocusStore({
      shapeObject: {
        get_ShapeProperties: () => ({
          asc_getFromSmartArt: () => false,
          asc_getFromSmartArtInternal: () => true,
        }),
        get_Vert: () => 0,
      },
    });

    const { container } = render(
      <Provider storeTextSettings={store} storeFocusObjects={focusStore}>
        <EditTextModule.EditText {...defaultProps} />
      </Provider>
    );

    // With SmartArt internal, indent row and bullets row should be hidden
    const buttonRows = container.querySelectorAll('.buttons');
    // Only 2 rows: formatting buttons + alignment buttons (no indent row)
    expect(buttonRows).toHaveLength(2);
  });

  it('shows "textFonts" as fallback when fontName is empty', () => {
    const store = makeTextStore({ fontName: '' });
    const focusStore = makeFocusStore();

    const { container } = render(
      <Provider storeTextSettings={store} storeFocusObjects={focusStore}>
        <EditTextModule.EditText {...defaultProps} />
      </Provider>
    );

    // When fontName is falsy, the component uses t('Edit.textFonts') as fallback
    const fontItem = container.querySelector('[data-title="Edit.textFonts"]');
    expect(fontItem).toBeTruthy();
  });
});
