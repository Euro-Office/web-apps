# Mobile Editor Testing Guide

## Overview

Tests for the mobile editors use [Vitest](https://vitest.dev/) with jsdom. They live co-located with source files in `__tests__/` directories.

## Running Tests

Tests run inside Docker (see [Readme](Readme.md#running-tests) for setup):

```bash
# From fork/develop/
docker compose exec eo bash -c 'cd /develop/web-apps && npm run test:run'
```

## Adding Tests to a New File

### 1. Create the test file

Place it in a `__tests__/` directory next to the source:

```
apps/documenteditor/mobile/src/controller/edit/
├── EditText.jsx
└── __tests__/
    └── EditText.test.js
```

### 2. Mock imports you don't need

Most source files import things the test doesn't care about (views, Framework7 components, other controllers). Mock them at the top of the test file:

```js
import { vi } from 'vitest';

// Stub the view — we're testing logic, not rendering
vi.mock('../../view/edit/EditText', () => ({ EditText: () => null }));
```

### 3. Use the SDK mock API

For code that calls the editor API, use the test helpers:

```js
import { installMockApi, resetMockApi } from '@common/lib/sdk/testHelpers';

let api;
beforeEach(() => { api = installMockApi(); });
afterEach(() => resetMockApi());

it('registers a callback', () => {
  myFunction();
  expect(api.asc_registerCallback).toHaveBeenCalledWith('asc_onSomething', expect.any(Function));
});
```

### 4. For controllers: extract pure logic first

Controllers are tightly coupled to React lifecycle and the SDK. Instead of trying to render them, extract testable logic into exported functions:

```js
// In the controller file — export pure functions
export const clampFontSize = (curSize, isDecrement) => {
    if (typeof curSize === 'undefined') return { useStepApi: true };
    const size = isDecrement ? Math.max(1, curSize - 1) : Math.min(300, curSize + 1);
    return { size, useStepApi: false };
};

// The controller class/component uses the extracted function
changeFontSize(curSize, isDecrement) {
    const api = getApi();
    const result = clampFontSize(curSize, isDecrement);
    // ...
}
```

Then test the pure function directly:

```js
import { clampFontSize } from '../EditText';

it('clamps minimum to 1', () => {
    expect(clampFontSize(1, true)).toEqual({ size: 1, useStepApi: false });
});
```

## SDK Adapter (`getApi()`)

Production code should use `getApi()` instead of `Common.EditorApi.get()`:

```js
import { getApi } from '@common/lib/sdk/api';

// Instead of: const api = Common.EditorApi.get();
const api = getApi();
```

This makes the code testable via `installMockApi()`. Migrate files as you add tests — old code using `Common.EditorApi.get()` directly continues to work.

## Global Stubs

`vitest.setup.js` provides stubs for SDK globals (`Asc`, `Common`, etc.). If your test hits an undefined global, add the stub there.

## Framework7 and SVG

- Framework7 components are stubbed via `vitest.stubs/framework7-react.js` and `vitest.stubs/framework7.js`
- SVG imports are stubbed by a vite plugin in `vitest.config.js` — they return `{ id: 'filename' }`
- To mock Framework7 in a specific test, use `vi.mock('framework7-react', ...)`

## Dependency Versions

Runtime dependencies (react, mobx, etc.) are pinned to exact versions in `package.json` matching what's installed in `vendor/framework7-react/node_modules/`. A pre-test check validates this automatically. If you update dependencies in vendor, update `package.json` to match.
